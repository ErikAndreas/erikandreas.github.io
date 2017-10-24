self.addEventListener('push', (event) => {
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

const winToOpen = async (urlToOpen) => {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
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
}

self.addEventListener('notificationclick', (event) => {
  console.log('click from notification!');
  const page = '/ts/';
  const urlToOpen = new URL(page, self.location.origin).href;
  event.waitUntil(winToOpen(urlToOpen));
});