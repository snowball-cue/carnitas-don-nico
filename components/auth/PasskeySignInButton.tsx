"use client";

import * as React from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import WebAuthnSupportedGuard from "./WebAuthnSupportedGuard";

interface PasskeySignInButtonProps {
  email?: string;
  redirectTo?: string;
  className?: string;
  variant?: "default" | "oro" | "outline" | "outline-papel" | "ghost";
  size?: "sm" | "default" | "lg" | "xl" | "icon";
  label?: string;
}

/**
 * Client-side passkey sign-in. On success we receive a magic-link `actionLink`
 * back from the server and navigate to it — Supabase then sets the session
 * cookies via `/auth/callback`.
 */
export function PasskeySignInButton({
  email,
  redirectTo,
  className,
  variant = "default",
  size = "xl",
  label,
}: PasskeySignInButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);
  const [deviceLabel, setDeviceLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod|Mac OS X/i.test(ua)) {
      setDeviceLabel("Face ID / Touch ID");
    } else if (/Windows/i.test(ua)) {
      setDeviceLabel("Windows Hello");
    } else if (/Android/i.test(ua)) {
      setDeviceLabel("Android");
    } else {
      setDeviceLabel(null);
    }
  }, []);

  async function run() {
    setLoading(true);
    try {
      const optsRes = await fetch("/api/passkey/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email ?? null }),
      });
      if (!optsRes.ok) {
        const { error } = await optsRes.json().catch(() => ({ error: "error" }));
        throw new Error(error || "options_failed");
      }
      const { options } = await optsRes.json();

      const asnResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: asnResp, email: email ?? null }),
      });
      if (!verifyRes.ok) {
        const { error } = await verifyRes.json().catch(() => ({ error: "error" }));
        throw new Error(error || "verify_failed");
      }
      const { actionLink } = (await verifyRes.json()) as { actionLink: string };

      // Append the post-callback redirect target.
      let target = actionLink;
      if (redirectTo) {
        const sep = actionLink.includes("?") ? "&" : "?";
        target = `${actionLink}${sep}next=${encodeURIComponent(redirectTo)}`;
      }
      window.location.href = target;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      if (!/NotAllowed|cancel/i.test(message)) {
        toast.error(t("auth.passkeySignInFailed") ?? "Could not sign in with passkey.", {
          description: message,
        });
      }
      setLoading(false);
    }
  }

  const text =
    label ??
    (deviceLabel
      ? (t("auth.signInWithDevice", { device: deviceLabel }) as string) ??
        `Sign in with ${deviceLabel}`
      : (t("auth.signInWithPasskey") as string) ?? "Sign in with a passkey");

  return (
    <WebAuthnSupportedGuard>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={run}
        disabled={loading}
      >
        {loading ? <Loader2 className="animate-spin" /> : <Fingerprint />}
        {text}
      </Button>
    </WebAuthnSupportedGuard>
  );
}

export default PasskeySignInButton;
