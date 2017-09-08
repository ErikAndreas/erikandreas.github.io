self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('HIITify').then(cache => {
      return cache.addAll([
       '/HIITify/',
       '/HIITify/index.html',
       '/HIITify/index.htm?homescreen=1',
       '/HIITify/?homescreen=1',
       '/HIITify/img/logo.png'
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