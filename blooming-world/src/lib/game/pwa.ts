/* ============================================================
 * Bloom Match — PWA layer (Волна 5).
 *
 * Регистрация service worker (только http/https — в file://
 * standalone SW недоступен), перехват beforeinstallprompt и
 * кнопка «установить приложение» в профиле. События уходаят
 * в лёгкую аналитику (Волна 2), ключ ≠ сейв (§5.4).
 * ============================================================ */

import { logEvent } from './analytics';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
let registered = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

/** Доступна ли установка (beforeinstallprompt пойман). */
export function installAvailable(): boolean {
  return deferredPrompt !== null;
}

/** Запущено ли как установленное приложение (без кнопки установки). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    nav.standalone === true
  );
}

export function subscribePwa(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Регистрация SW + слушатели установки. Вызывается один раз из
 * page.tsx; безопасно вызывать повторно и на SSR (no-op).
 */
export function initPwa(): void {
  if (registered || typeof window === 'undefined') return;
  registered = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
    logEvent('pwa_install');
  });

  const proto = window.location.protocol;
  const local = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  /* SW только на https (прод) или http://localhost (дев-проверки) */
  const swAllowed = proto === 'https:' || (proto === 'http:' && local);
  if ('serviceWorker' in navigator && swAllowed) {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* оффлайн-кэш недоступен — игра всё равно работает */
    });
  }
}

/** Показать нативный диалог установки. false — приглашения не было. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const ev = deferredPrompt;
  deferredPrompt = null;
  emit();
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    logEvent('pwa_install_prompt', { outcome: choice.outcome });
    return choice.outcome === 'accepted';
  } catch {
    return false;
  }
}
