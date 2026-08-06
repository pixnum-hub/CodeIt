// CodeIt service worker — caches the app shell so the editor (and the
// offline HTML/Preview tab) keep working without a network connection.
// Bump CACHE_VERSION whenever any precached file changes.
const CACHE_VERSION = 'codeit-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/favicon-16.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-icon-192.png',
  './icons/maskable-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle same-origin GET requests — never intercept or cache
  // the code-execution API (emkc.org) or any other cross-origin call.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Cache-first for the app shell, with a background refresh so updates
  // still propagate; fall back to the cached page for navigations if
  // the network is unavailable.
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));

      return cached || fetchPromise;
    })
  );
});
