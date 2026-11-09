/* ============================================================
 * Bloom Match — platform layer (Волна 5: платформы).
 *
 * Абстракция над площадками: веб (по умолчанию) и Yandex Games
 * SDK v2 (LoadingAPI / GameplayAPI / leaderboards). Все обращения
 * к window/document — ТОЛЬКО внутри функций (SSR-безопасность, §5.5).
 * Для тестов загрузчик SDK инъекцируется (setSdkLoader).
 * ============================================================ */

export type PlatformId = 'web' | 'yandex';

/** Минимальный структурный тип Yandex Games SDK (используемое подмножество). */
export interface YsdkLike {
  features?: {
    LoadingAPI?: { ready?: () => void };
    GameplayAPI?: { start?: () => void; stop?: () => void };
  };
  leaderboards?: {
    setLeaderboardScore?: (name: string, score: number) => Promise<unknown> | void;
  };
}

interface YaGamesLike {
  init: () => Promise<YsdkLike>;
}

declare global {
  interface Window {
    YaGames?: YaGamesLike;
    ysdk?: YsdkLike;
  }
}

/** Техническое имя лидерборда — должно совпадать с консолью Yandex Games. */
export const LEADERBOARD_ID = 'levels';

/** Таймаут загрузки/инициализации SDK, мс (тихий фолбэк в «web»). */
export const SDK_TIMEOUT_MS = 4000;

/** Кандидаты URL SDK. Относительный путь — официальный способ: на
 * хостинге Яндекса файл /sdk.js всегда существует; на любом другом
 * хосте — мгновенный 404 → тихий фолбэк в «web» (без внешних
 * запросов: CDN-заглушка Яндекса вне их фрейма всё равно не даёт API). */
let sdkCandidates: string[] = ['/sdk.js'];

/** Инъекция загрузчика скрипта для тестов (null — вернуть обычное поведение). */
let sdkLoaderOverride: ((src: string) => Promise<void>) | null = null;

let initPromise: Promise<PlatformId> | null = null;
let currentYsdk: YsdkLike | null = null;
let gameplayActive = false;
let lastSubmittedLevel = 0;

export function setSdkCandidates(list: string[]): void {
  sdkCandidates = list.slice();
}

export function setSdkLoader(loader: ((src: string) => Promise<void>) | null): void {
  sdkLoaderOverride = loader;
}

/** Только для тестов: сброс синглтона. */
export function resetPlatformForTests(): void {
  initPromise = null;
  currentYsdk = null;
  gameplayActive = false;
  lastSubmittedLevel = 0;
  sdkLoaderOverride = null;
  sdkCandidates = ['/sdk.js'];
}

function loadScript(src: string): Promise<void> {
  if (sdkLoaderOverride) return sdkLoaderOverride(src);
  return new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('no document'));
      return;
    }
    const script = document.createElement('script');
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error(`sdk timeout: ${src}`));
      }
    }, SDK_TIMEOUT_MS);
    script.src = src;
    script.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve();
      }
    };
    script.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        reject(new Error(`sdk load error: ${src}`));
      }
    };
    document.head.appendChild(script);
  });
}

async function loadFirstAvailable(): Promise<YaGamesLike | null> {
  for (const src of sdkCandidates) {
    try {
      await loadScript(src);
      if (typeof window !== 'undefined' && window.YaGames) return window.YaGames;
    } catch {
      /* следующий кандидат */
    }
  }
  return null;
}

/**
 * Инициализация площадки (идемпотентно). При успехе вызывает
 * LoadingAPI.ready() — площадка снимает загрузочный экран.
 * Никогда не бросает: любая ошибка = обычный веб-режим.
 */
export function initPlatform(): Promise<PlatformId> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (typeof window === 'undefined') return 'web';
    try {
      if (window.ysdk) {
        currentYsdk = window.ysdk;
      } else if (window.YaGames) {
        currentYsdk = await window.YaGames.init();
      } else {
        const ya = await loadFirstAvailable();
        if (ya) currentYsdk = await ya.init();
      }
    } catch {
      currentYsdk = null;
    }
    if (currentYsdk) {
      try {
        currentYsdk.features?.LoadingAPI?.ready?.();
      } catch {
        /* площадка прощает */
      }
      return 'yandex';
    }
    return 'web';
  })();
  return initPromise;
}

export function currentPlatform(): PlatformId {
  return currentYsdk ? 'yandex' : 'web';
}

/** GameplayAPI.start — игрок в геймплее (не в меню/модали). */
export function platformGameplayStart(): void {
  if (!currentYsdk || gameplayActive) return;
  gameplayActive = true;
  try {
    currentYsdk.features?.GameplayAPI?.start?.();
  } catch {
    /* noop */
  }
}

/** GameplayAPI.stop — победа/поражение/выход из уровня. */
export function platformGameplayStop(): void {
  if (!currentYsdk || !gameplayActive) return;
  gameplayActive = false;
  try {
    currentYsdk.features?.GameplayAPI?.stop?.();
  } catch {
    /* noop */
  }
}

/**
 * Отправка лучшего уровня в лидерборд площадки. Вызывается после
 * победы; повторные сабмиты того же/меньшего уровня отбрасываются
 * локально (площадка и так хранит максимум — экономим квоту).
 */
export function submitScoreToLeaderboard(level: number): void {
  if (!currentYsdk || !Number.isFinite(level)) return;
  if (level <= lastSubmittedLevel) return;
  lastSubmittedLevel = level;
  try {
    const res = currentYsdk.leaderboards?.setLeaderboardScore?.(LEADERBOARD_ID, level);
    if (res && typeof (res as Promise<unknown>).catch === 'function') {
      (res as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* noop */
  }
}
