const CACHE = 'codeit-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache the code-execution API — always go to the network live
  if(url.hostname.includes('emkc.org')){
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', {status: 503})));
    return;
  }

  // App shell: cache-first, falling back to network, then updating the cache
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if(res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
