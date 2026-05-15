"use client";

import * as React from "react";
import { Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import PasskeyEnrollButton from "@/components/auth/PasskeyEnrollButton";

type Status = "unknown" | "unsupported" | "has-passkeys" | "needs-one";

/**
 * Owner-facing "set up FaceID / fingerprint sign-in" card.
 * Renders on /admin only while there's no passkey on file — once Don Nico
 * has registered at least one device, the card hides itself and stays out
 * of the way until they manage passkeys from /account.
 */
export function PasskeySetup() {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<Status>("unknown");

  const refresh = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!window.PublicKeyCredential) {
      setStatus("unsupported");
      return;
    }
    try {
      const res = await fetch("/api/passkey/list", { cache: "no-store" });
      if (!res.ok) {
        // Treat list-fetch failure as "needs one" so the prompt is visible.
        setStatus("needs-one");
        return;
      }
      const { passkeys } = await res.json();
      setStatus(
        Array.isArray(passkeys) && passkeys.length > 0
          ? "has-passkeys"
          : "needs-one",
      );
    } catch {
      setStatus("needs-one");
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (status === "unknown" || status === "unsupported" || status === "has-passkeys") {
    return null;
  }

  return (
    <Card className="border-2 border-agave/30">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-agave/20 text-agave">
            <Fingerprint className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg text-mole">
              {t(
                "admin.passkey.title",
                "Sign in with your face or fingerprint",
              )}
            </p>
            <p className="text-sm text-mole/70">
              {t(
                "admin.passkey.hint",
                "Add this device once. Next time, tap your photo on the login screen — no password.",
              )}
            </p>
          </div>
        </div>
        <div className="sm:shrink-0">
          <PasskeyEnrollButton
            onEnrolled={() => void refresh()}
            size="lg"
            variant="oro"
            label={t("admin.passkey.cta", "Set it up") ?? "Set it up"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default PasskeySetup;
