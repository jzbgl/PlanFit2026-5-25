const CACHE = 'planfit-v1';
const URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  (e as any).waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS))
  );
});

self.addEventListener('fetch', (e) => {
  (e as any).respondWith(
    caches.match((e as any).request).then((r) => r || fetch((e as any).request))
  );
});
