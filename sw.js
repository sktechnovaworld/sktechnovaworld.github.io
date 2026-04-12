self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  const url = "https://sktechnovaworld.github.io/deals.html";

  event.waitUntil(
    clients.openWindow(url)
  );
});