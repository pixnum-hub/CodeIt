const CACHE_NAME = 'codeit-shell-v1';
const APP_SHELL = [
  './CodeIt.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Code execution must always hit the network live — never cache it.
  if (url.includes('emkc.org')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Only cache this app's own files and the CodeMirror/js-beautify CDN.
  // Everything else passes straight through untouched.
  const isCacheable = e.request.method === 'GET' && (
    url.startsWith(self.location.origin) ||
    url.includes('cdnjs.cloudflare.com')
  );
  if (!isCacheable) return;

  // Network-first for the app shell (HTML/manifest) so edits to CodeIt.html
  // reach installed users automatically, with a cached fallback offline.
  const isAppDoc = e.request.mode === 'navigate' ||
    url.endsWith('/CodeIt.html') ||
    url.endsWith('/manifest.json') ||
    url === self.location.origin + '/';
  if (isAppDoc) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for CDN libraries and icons: fast offline loads, refreshed
  // in the background whenever a newer copy is fetched successfully.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
