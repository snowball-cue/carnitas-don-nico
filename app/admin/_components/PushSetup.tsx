"use client";

import * as React from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  sendPushTest,
} from "@/app/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate the backing ArrayBuffer explicitly so the resulting view is
  // typed as Uint8Array<ArrayBuffer>, which the Push API accepts as a
  // BufferSource. (TS 5.7 distinguishes ArrayBuffer vs ArrayBufferLike.)
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

type Status =
  | "unknown"
  | "unsupported"
  | "no-vapid"
  | "denied"
  | "default"
  | "subscribed"
  | "needs-sw";

export function PushSetup() {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<Status>("unknown");
  const [pending, setPending] = React.useState(false);
  const [endpoint, setEndpoint] = React.useState<string | null>(null);

  // Probe current state on mount.
  React.useEffect(() => {
    void (async () => {
      if (typeof window === "undefined") return;
      if (!VAPID_PUBLIC_KEY) {
        setStatus("no-vapid");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setStatus("needs-sw");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      const perm = Notification.permission;
      if (sub) {
        setEndpoint(sub.endpoint);
        setStatus("subscribed");
      } else if (perm === "denied") {
        setStatus("denied");
      } else {
        setStatus("default");
      }
    })();
  }, []);

  const enable = React.useCallback(async () => {
    setPending(true);
    try {
      // 1) Sanity-check that the VAPID public key actually shipped. If it's
      //    blank, subscribe() throws an opaque error that looks like nothing
      //    happened.
      if (!VAPID_PUBLIC_KEY) {
        toast.error(
          t(
            "admin.push.noVapidToast",
            "Server isn't set up for push yet. Ask the developer to add the VAPID keys.",
          ),
        );
        return;
      }

      // 2) Explicitly request permission first. Some browsers (notably iOS
      //    Safari / WebKit) won't auto-prompt from subscribe() and will
      //    silently reject if Notification.permission is still "default".
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") {
          setStatus("denied");
          toast.error(
            t(
              "admin.push.deniedToast",
              "Notifications blocked. Enable them in your phone's settings for this app, then try again.",
            ),
          );
        } else {
          // "default" = user dismissed the prompt without choosing.
          toast(
            t(
              "admin.push.dismissedToast",
              "No problem — tap the button again when you're ready.",
            ),
          );
        }
        return;
      }

      // 3) Wait for the SW, with a hard timeout so we never hang silently
      //    on a browser that's mis-registered.
      const reg = await Promise.race<ServiceWorkerRegistration>([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) =>
          setTimeout(
            () => reject(new Error("Service worker isn't ready yet.")),
            8000,
          ),
        ),
      ]);

      // 4) Subscribe. If a subscription already exists for this device we'll
      //    get back the same one — that's fine, we just re-upsert it.
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const raw = sub.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
        toast.error(
          t(
            "admin.push.badSubToast",
            "Couldn't save this device's subscription. Try again.",
          ),
        );
        return;
      }

      // 5) Persist on the server. If THIS step fails, also drop the local
      //    subscription so we don't end up with a phantom device the user
      //    can't see in the inbox.
      const res = await registerPushSubscription({
        endpoint: raw.endpoint,
        keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
        userAgent: navigator.userAgent,
      });
      if (!res.success) {
        try {
          await sub.unsubscribe();
        } catch {
          /* best effort */
        }
        toast.error(res.error, {
          description: t(
            "admin.push.saveFailedHint",
            "Sign in again and retry. If it keeps happening, the database migration may not be applied.",
          ),
        });
        return;
      }

      setEndpoint(raw.endpoint);
      setStatus("subscribed");
      toast.success(
        t(
          "admin.push.enabledToast",
          "Notifications on. You'll get a ping when a customer orders.",
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (Notification.permission === "denied") {
        setStatus("denied");
        toast.error(
          t(
            "admin.push.deniedToast",
            "Notifications blocked. Enable them in your phone's settings for this app, then try again.",
          ),
        );
      } else {
        toast.error(
          t("admin.push.errorToast", "Couldn't turn on notifications."),
          { description: msg },
        );
      }
    } finally {
      setPending(false);
    }
  }, [t]);

  const disable = React.useCallback(async () => {
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const ep = sub.endpoint;
        await sub.unsubscribe();
        await unregisterPushSubscription(ep);
      }
      setEndpoint(null);
      setStatus("default");
      toast.success(
        t("admin.push.disabledToast", "Notifications turned off."),
      );
    } finally {
      setPending(false);
    }
  }, [t]);

  const test = React.useCallback(async () => {
    setPending(true);
    try {
      const res = await sendPushTest();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.sent === 0) {
        toast.error(
          t(
            "admin.push.testNoDevices",
            "No devices registered yet. Tap 'Turn on notifications' first.",
          ),
        );
        return;
      }
      toast.success(
        t("admin.push.testSent", "Test sent to {{count}} device(s).", {
          count: res.sent,
        }),
      );
    } finally {
      setPending(false);
    }
  }, [t]);

  if (status === "unknown") return null;
  if (status === "unsupported" || status === "no-vapid") return null;

  return (
    <Card className="border-2 border-oro/30">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              status === "subscribed"
                ? "bg-nopal text-papel"
                : "bg-oro/30 text-mole"
            }`}
          >
            {status === "subscribed" ? (
              <BellRing className="h-6 w-6" strokeWidth={2.25} />
            ) : status === "denied" ? (
              <BellOff className="h-6 w-6" strokeWidth={2.25} />
            ) : (
              <Bell className="h-6 w-6" strokeWidth={2.25} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg text-mole">
              {status === "subscribed"
                ? t("admin.push.onTitle", "Order notifications are on")
                : status === "denied"
                  ? t("admin.push.deniedTitle", "Notifications blocked")
                  : t(
                      "admin.push.offTitle",
                      "Get a phone ping for every new order",
                    )}
            </p>
            <p className="text-sm text-mole/70">
              {status === "subscribed"
                ? t(
                    "admin.push.onHint",
                    "We'll buzz this device when a customer orders, cancels, or asks about catering.",
                  )
                : status === "denied"
                  ? t(
                      "admin.push.deniedHint",
                      "Turn notifications back on in your browser settings to receive order alerts.",
                    )
                  : t(
                      "admin.push.offHint",
                      "Install the app first (button at the top), then tap below to turn on alerts.",
                    )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {status === "subscribed" ? (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={() => void test()}
                disabled={pending}
              >
                {t("admin.push.test", "Send test")}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => void disable()}
                disabled={pending}
              >
                {t("admin.push.off", "Turn off")}
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="oro"
              onClick={() => void enable()}
              disabled={pending || status === "denied"}
            >
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {pending
                ? t("admin.push.working", "Setting up…")
                : t("admin.push.on", "Turn on notifications")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
