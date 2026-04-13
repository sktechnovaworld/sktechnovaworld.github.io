const CACHE_NAME = 'Zivio-v2';

self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  const url = "https://sktechnovaworld.github.io/";

  event.waitUntil(
    clients.openWindow(url)
  );
});