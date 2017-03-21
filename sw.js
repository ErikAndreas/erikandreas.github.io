self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('nyhren').then(cache => {
      return cache.addAll([
       '/',
       '/index.htm',
       '/index.htm?homescreen=1',
       '/?homescreen=1',
       'https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.min.css',
       'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
      ])
      .then(() => self.skipWaiting());
    })
  )
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});