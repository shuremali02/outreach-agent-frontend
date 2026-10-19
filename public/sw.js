// Service worker -- user, 2026-10-18: "hum apny web ko install krny k qabil bana dyn... is sy humyn woh
// notification wala kam easy ho jayega". Two jobs, deliberately kept this small:
//   1. A service worker is required for the browser to offer "Install app" at all (PWA baseline) -- no
//      offline caching here on purpose, that's a separate decision, not asked for.
//   2. Handles real Web Push events once the backend push-sending piece exists (VAPID keys + subscription
//      storage, not built yet as of this file) -- written now so the backend work doesn't need to come
//      back and edit this file too. Until that backend piece ships, "push" below simply never fires.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Minimal pass-through fetch handler -- some browsers' install-eligibility checks still look for one,
// even with no caching behind it.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Elipse Studio", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Elipse Studio";
  const options = {
    body: data.body || "",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/today" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click -- focus an already-open tab on the right page if one exists, otherwise open a new one. Mirrors
// notification-bell.tsx's own go() routing, duplicated here since a service worker has no access to the
// page's React Query cache/router (it runs in its own isolated context).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.length > 0 && "navigate" in clients[0]) {
        return clients[0].navigate(url).then((c) => c && c.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
