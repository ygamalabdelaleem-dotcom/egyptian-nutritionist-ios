const CACHE_NAME = 'egy-nutritionist-v11';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './styles.css?v=11',
  './manifest.json',
  './icon.svg',
  './data/egyptian-foods.js',
  './data/egyptian-foods.js?v=11',
  './js/app.js',
  './js/app.js?v=11'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
