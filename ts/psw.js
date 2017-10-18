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