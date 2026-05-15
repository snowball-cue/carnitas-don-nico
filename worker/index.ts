/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// This file is appended to the generated next-pwa service worker. It runs
// inside the SW global scope, so `self` here is the ServiceWorkerGlobalScope.

declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = { title: "Carnitas Don Nico" };

  if (event.data) {
    try {
      payload = { ...payload, ...(event.data.json() as PushPayload) };
    } catch {
      // Fall back to plain-text body if the payload isn't JSON.
      payload.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? "/brand/logo.png",
    badge: payload.badge ?? "/brand/logo.png",
    tag: payload.tag,
    data: { url: payload.url ?? "/admin/orders", ...(payload.data ?? {}) },
    // Default Apple/Android sound; vibrate keys are typed but optional and
    // not all UA flavours pass the lib.dom test, so guard at runtime.
    ...(typeof (Notification as any).maxActions === "number"
      ? {}
      : {}),
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as { url?: string };
  const targetUrl = data.url || "/admin/orders";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // If the app is already open in a tab/PWA window, focus it and navigate.
      for (const client of allClients) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await (client as WindowClient).navigate(targetUrl);
            } catch {
              /* ignore navigation failures */
            }
          }
          return;
        }
      }
      // Otherwise open a new window.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

export {}; // keep TypeScript happy about top-level scoping
