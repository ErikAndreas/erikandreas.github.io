self.addEventListener('push', function(event) {
    if (event.data) {
      console.log('This push event has data: ', event.data.text());
      const data = event.data.json();
      const promiseChain = self.registration.showNotification(data.notification.title, {
        body: data.notification.body,
        tag: data.notification.tag,
        renotify: true
      });
      event.waitUntil(promiseChain);
    } else {
      console.log('This push event has no data.');
    }
});

self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('install, skipped waiting');
});

self.addEventListener('notificationclick', function(event) {
  console.log('click from notification');
  const page = '/ts/';
  const urlToOpen = new URL(page, self.location.origin).href;
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });
  event.waitUntil(promiseChain);
});