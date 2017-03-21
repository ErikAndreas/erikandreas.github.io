self.addEventListener('install', function(e) {
 e.waitUntil(
   caches.open('nyhren').then(function(cache) {
     return cache.addAll([
       '/',
       '/index.html',
       '/index.html?homescreen=1',
       '/?homescreen=1',
       'https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.min.css',
       'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
     ]);
   })
 );
});