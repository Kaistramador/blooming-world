/* ============================================================
 * Blooming World — service worker (standalone, Волна 5: PWA).
 * Относительные пути: работает в сабпапке (GitHub Pages).
 * index.html — один файл: кэшируем оболочку + иконки + манифест.
 * ============================================================ */

const VERSION = 'v5.0.0';
const STATIC_CACHE = 'blooming-world-standalone-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
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
          .filter((n) => n.startsWith('blooming-world-') && n !== STATIC_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    /* network-first с фолбэком на кэшированную оболочку (оффлайн) */
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put('./index.html', res.clone());
          return res;
        } catch (err) {
          const fallback =
            (await cache.match('./index.html')) || (await cache.match('./'));
          if (fallback) return fallback;
          throw err;
        }
      })(),
    );
    return;
  }

  /* прочие same-origin GET: cache-first с фоновым обновлением */
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) {
        fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
          })
          .catch(() => {});
        return cached;
      }
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })(),
  );
});
