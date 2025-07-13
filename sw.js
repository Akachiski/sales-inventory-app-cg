self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('sales-inventory-cache').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './styles.css',
        './app.js',
        './manifest.json',
        './sw.js'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
