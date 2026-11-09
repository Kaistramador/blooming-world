/* ============================================================
 * Blooming World — service worker (Волна 5: PWA).
 * Стратегии:
 *  - навигация (HTML)  → network-first, офлайн-фолбэк на кэш "/";
 *  - статика Next (_next/static) и публичные ассеты → cache-first
 *    с фоновым обновлением (stale-while-revalidate);
 *  - прочие same-origin GET → network-first с фолбэком на кэш.
 * Кэш версионируется: смена SW-версии чистит старые кэши.
 * ============================================================ */

const VERSION = 'v5.0.0';
const STATIC_CACHE = `blooming-world-static-${VERSION}`;
const RUNTIME_CACHE = `blooming-world-runtime-${VERSION}`;

/* Ядро: оболочка приложения + манифест + иконки.
 * Эры (public/eras/*.webp) кладём в прекэш — 10 картинок ~556 KB,
 * это даёт полный оффлайн для карты/игры без похода в сеть. */
const PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/eras/era-0.webp',
  '/eras/era-1.webp',
  '/eras/era-2.webp',
  '/eras/era-3.webp',
  '/eras/era-4.webp',
  '/eras/era-5.webp',
  '/eras/era-6.webp',
  '/eras/era-7.webp',
  '/eras/era-8.webp',
  '/eras/era-9.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      /* Кэшируем ядро поштучно: один битый URL не срывает установку. */
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('blooming-world-') && n !== STATIC_CACHE && n !== RUNTIME_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    /* фоновое обновление, не блокируя ответ */
    fetch(request)
      .then((res) => {
        if (res && res.ok) cache.put(request, res.clone());
      })
      .catch(() => {});
    return cached;
  }
  const res = await fetch(request);
  if (res && res.ok && res.type === 'basic') {
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // чужие домены не трогаем

  /* навигация по страницам */
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, RUNTIME_CACHE, '/'));
    return;
  }

  /* неизменяемая статика Next */
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  /* публичные ассеты (эры, иконки, манифест) */
  if (
    url.pathname.startsWith('/eras/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  /* прочие same-origin GET (в т.ч. чанки dev-сервера) */
  event.respondWith(networkFirst(req, RUNTIME_CACHE));
});
