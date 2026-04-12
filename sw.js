self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  const url = "https://sktechnovaworld.github.io/";

  event.waitUntil(
    clients.openWindow(url)
  );
});