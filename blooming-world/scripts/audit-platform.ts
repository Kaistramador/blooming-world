/* ============================================================
 * Волна 5: аудит PWA + платформенной интеграции.
 * Проверяет (без сети):
 *  1. манифест Next (public/manifest.json) — обязательные поля,
 *     иконки существуют и реально нужного размера (PNG IHDR);
 *  2. service worker'ы — fetch-обработчик, версионирование кэша,
 *     оффлайн-фолбэк навигации, прекэш манифеста;
 *  3. platform.ts — SSR-безопасность импорта; с mock-SDK:
 *     init → yandex + LoadingAPI.ready, GameplayAPI start/stop,
 *     лидерборд: сабмит роста уровня, дедуп меньшего;
 *     отказ SDK → тихий фолбэк в «web» (таймаут < 4 c);
 *  4. зеркала standalone: shell.html (манифест + SW-регистрация
 *     с file://-гвардом), app-core.js (SDK-секция), app-ui.js
 *     (gameplay/leaderboard-хуки, кнопка установки), data.js (i18n).
 * Запуск: bun scripts/audit-platform.ts
 * ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function pngSize(file: string): [number, number] {
  const buf = readFileSync(file);
  // PNG: 8-байтовая подпись, затем IHDR: ширина/высота в байтах 16..23
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/* ---------- 1. Манифест Next ---------- */
console.log('\n[1] Манифест Next (public/manifest.json)');
const manifestPath = path.join(ROOT, 'public', 'manifest.json');
check('файл существует', existsSync(manifestPath));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
check('name/short_name', !!manifest.name && !!manifest.short_name);
check('start_url/scope', manifest.start_url === '/' && manifest.scope === '/');
check('display standalone', manifest.display === 'standalone');
check('theme_color + background_color', !!manifest.theme_color && !!manifest.background_color);
check('orientation portrait', String(manifest.orientation).startsWith('portrait'));
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
check('иконки 192 + 512 + maskable',
  icons.some((i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'any') &&
  icons.some((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'any') &&
  icons.some((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable'),
);
for (const icon of icons) {
  const file = path.join(ROOT, 'public', icon.src);
  check(`иконка на диске: ${icon.src}`, existsSync(file));
  if (existsSync(file)) {
    const [w, h] = pngSize(file);
    check(`размер ${icon.src} = ${icon.sizes}`, `${w}x${h}` === icon.sizes, `${w}x${h}`);
  }
}

/* ---------- 2. Service workers ---------- */
console.log('\n[2] Service workers');
const swNext = readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
check('fetch-обработчик', swNext.includes("addEventListener('fetch'"));
check('версионированный кэш + чистка активации', swNext.includes('-${VERSION}') && swNext.includes("caches.delete"));
check('network-first навигация с фолбэком "/"', swNext.includes("req.mode === 'navigate'") && swNext.includes("'/"));
check('прекэш: оболочка, манифест, иконки, эры',
  PRECACHE_LIST_OK(swNext),
);
check('прекэш всех 10 эр', (swNext.match(/\/eras\/era-\d+\.webp/g) ?? []).length === 10);
check('только GET + same-origin', swNext.includes("req.method !== 'GET'") && swNext.includes('url.origin !== self.location.origin'));

const swStandalone = readFileSync(path.join(ROOT, 'scripts', 'standalone', 'parts', 'sw.js'), 'utf8');
check('standalone SW: fetch-обработчик', swStandalone.includes("addEventListener('fetch'"));
check('standalone SW: оффлайн-фолбэк index.html', swStandalone.includes("cache.match('./index.html')"));
check('standalone SW: относительные пути (сабпапка)', swStandalone.includes("'./index.html'") && swStandalone.includes("'./manifest.json'"));

function PRECACHE_LIST_OK(src: string): boolean {
  return src.includes("'/'") && src.includes("'/manifest.json'") && src.includes("'/icons/icon-192.png'") && src.includes("'/icons/icon-512.png'") && src.includes("'/icons/icon-maskable-512.png'");
}

/* ---------- 3. platform.ts — поведение с mock-SDK ---------- */
console.log('\n[3] platform.ts: mock Yandex SDK');
const mod = await import(path.join(ROOT, 'src', 'lib', 'game', 'platform.ts')) as typeof import('../src/lib/game/platform');
const calls = { ready: 0, start: 0, stop: 0, scores: [] as Array<{ name: string; level: number }> };

const ysdkMock = {
  features: {
    LoadingAPI: { ready: () => { calls.ready += 1; } },
    GameplayAPI: { start: () => { calls.start += 1; }, stop: () => { calls.stop += 1; } },
  },
  leaderboards: {
    setLeaderboardScore: (name: string, level: number) => {
      calls.scores.push({ name, level });
      return Promise.resolve();
    },
  },
};
const g = globalThis as unknown as { window?: Record<string, unknown>; document?: unknown };
g.window = g.window ?? (globalThis as unknown as Record<string, unknown>);
(g.window as Record<string, unknown>).YaGames = { init: async () => { (g.window as Record<string, unknown>).ysdk = ysdkMock; return ysdkMock; } };
(g.window as Record<string, unknown>).ysdk = undefined;
mod.setSdkLoader(async () => { /* SDK уже «загружен» через window.YaGames выше */ });

const t0 = Date.now();
const platformId = await mod.initPlatform();
check('init → yandex', platformId === 'yandex', platformId);
check('LoadingAPI.ready вызван', calls.ready >= 1);
check('идемпотентность (повторный init не дублирует ready)', (await mod.initPlatform()) === 'yandex' && calls.ready === 1);

mod.platformGameplayStart();
mod.platformGameplayStart(); // повтор без stop — игнорируется
check('GameplayAPI.start ровно 1 раз', calls.start === 1, String(calls.start));
mod.platformGameplayStop();
mod.platformGameplayStop(); // повтор без start — игнорируется
check('GameplayAPI.stop ровно 1 раз', calls.stop === 1, String(calls.stop));

mod.submitScoreToLeaderboard(3);
mod.submitScoreToLeaderboard(3); // дубликат
mod.submitScoreToLeaderboard(2); // меньше
check('лидерборд: один сабмит уровня 3', calls.scores.length === 1 && calls.scores[0].level === 3, JSON.stringify(calls.scores));
check('имя лидерборда = levels', calls.scores[0]?.name === mod.LEADERBOARD_ID);
mod.submitScoreToLeaderboard(7);
check('рост уровня сабмитится', calls.scores.length === 2 && calls.scores[1].level === 7, JSON.stringify(calls.scores));

/* фолбэк: SDK недоступен → «web» за разумное время */
mod.resetPlatformForTests();
(g.window as Record<string, unknown>).YaGames = undefined;
(g.window as Record<string, unknown>).ysdk = undefined;
mod.setSdkLoader(async () => { throw new Error('offline'); });
const t1 = Date.now();
const fallbackId = await mod.initPlatform();
const elapsed = Date.now() - t1;
check('отказ SDK → web', fallbackId === 'web', fallbackId);
check('фолбэк без долгого зависания (< 2 c)', elapsed < 2000, `${elapsed} мс`);
mod.platformGameplayStart();
check('в веб-режиме хуки безопасны (no-op)', calls.start === 1);
mod.submitScoreToLeaderboard(50);
check('в веб-режиме сабмитов нет', calls.scores.length === 2);
mod.resetPlatformForTests();
console.log(`  (mock-инициализация заняла ${Date.now() - t0} мс суммарно)`);

/* ---------- 4. Зеркала standalone ---------- */
console.log('\n[4] Зеркала standalone');
const shell = readFileSync(path.join(ROOT, 'scripts', 'standalone', 'shell.html'), 'utf8');
check('shell: link manifest.json', shell.includes('rel="manifest" href="manifest.json"'));
check('shell: theme-color', shell.includes('name="theme-color" content="#1a4a38"'));
check('shell: apple-touch-icon + apple-mobile-web-app', shell.includes('apple-touch-icon') && shell.includes('apple-mobile-web-app-capable'));
check('shell: SW-регистрация с file://-гвардом', shell.includes("navigator.serviceWorker.register('sw.js')") && shell.includes("proto === 'https:'"));
check('shell: localhost разрешён для дев-проверок', shell.includes("'localhost'"));

const core = readFileSync(path.join(ROOT, 'scripts', 'standalone', 'parts', 'app-core.js'), 'utf8');
check('app-core: SDK-секция (init/candidates/timeout)', core.includes('function initPlatform()') && core.includes('SDK_TIMEOUT_MS') && core.includes("SDK_CANDIDATES = ['/sdk.js']"));
check('app-core: LoadingAPI.ready', core.includes('LoadingAPI') && core.includes('.ready()'));
check('app-core: GameplayAPI start/stop с дедупликацией', core.includes('gameplayActive') && core.includes('GameplayAPI.start') && core.includes('GameplayAPI.stop'));
check('app-core: лидерборд с дедупликацией', core.includes('setLeaderboardScore(LEADERBOARD_ID') && core.includes('lastSubmittedLevel'));
check('app-core: PWA (beforeinstallprompt/appinstalled)', core.includes("addEventListener('beforeinstallprompt'") && core.includes("addEventListener('appinstalled'"));

const ui = readFileSync(path.join(ROOT, 'scripts', 'standalone', 'parts', 'app-ui.js'), 'utf8');
check('app-ui: gameplay start в mount', ui.includes('platformGameplayStart()'));
check('app-ui: gameplay stop на победе и поражении', (ui.match(/platformGameplayStop\(\)/g) ?? []).length >= 2);
check('app-ui: сабмит лидерборда после recordWin', ui.includes('submitScoreToLeaderboard(this.cfg.level)'));
check('app-ui: boot вызывает initPwa + initPlatform', ui.includes('initPwa();') && ui.includes('void initPlatform();'));
check('app-ui: кнопка установки в профиле', ui.includes("pwaInstallAvailable() && !pwaIsStandalone()") && ui.includes("t('profile.install')"));

const data = readFileSync(path.join(ROOT, 'scripts', 'standalone', 'parts', 'data.js'), 'utf8');
check('data.js: i18n установки RU+EN', data.includes("'profile.install': 'Установить приложение'") && data.includes("'profile.install': 'Install app'"));

const buildPy = readFileSync(path.join(ROOT, 'scripts', 'standalone', 'build.py'), 'utf8');
check('build.py: копирует manifest/sw/icons', buildPy.includes('AUX_FILES') && buildPy.includes('ICON_FILES'));

/* ---------- итог ---------- */
console.log('\n────────────────────────────');
if (failures === 0) {
  console.log('ALL CHECKS PASSED — PWA + платформы в порядке');
} else {
  console.error(`FAILED: ${failures} проверок(а)`);
  process.exit(1);
}
