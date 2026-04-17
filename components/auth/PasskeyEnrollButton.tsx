"use client";

import * as React from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface PasskeyEnrollButtonProps {
  onEnrolled?: () => void;
  variant?:
    | "default"
    | "oro"
    | "outline"
    | "outline-papel"
    | "ghost"
    | "link"
    | "destructive";
  size?: "sm" | "default" | "lg" | "xl" | "icon";
  promptNickname?: boolean;
  className?: string;
  label?: string;
}

export function PasskeyEnrollButton({
  onEnrolled,
  variant = "oro",
  size = "lg",
  promptNickname = true,
  className,
  label,
}: PasskeyEnrollButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);

  async function enroll() {
    setLoading(true);
    try {
      let nickname: string | null = null;
      if (promptNickname && typeof window !== "undefined") {
        nickname = window.prompt(t("auth.passkeyNicknamePrompt") ?? "Nickname for this device?", "") ?? null;
      }

      const optsRes = await fetch("/api/passkey/register/options", {
        method: "POST",
      });
      if (!optsRes.ok) {
        const { error } = await optsRes.json().catch(() => ({ error: "error" }));
        throw new Error(error || "options_failed");
      }
      const { options } = await optsRes.json();

      const attResp = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResp, nickname }),
      });
      if (!verifyRes.ok) {
        const { error } = await verifyRes.json().catch(() => ({ error: "error" }));
        throw new Error(error || "verify_failed");
      }

      toast.success(t("auth.passkeyAddedSuccess") ?? "Passkey added!");
      onEnrolled?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "unknown";
      // Swallow user-cancelled "NotAllowedError" quietly.
      if (!/NotAllowed|cancel/i.test(message)) {
        toast.error(t("auth.passkeyAddFailed") ?? "Could not add passkey.", {
          description: message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={enroll}
      disabled={loading}
    >
      {loading ? <Loader2 className="animate-spin" /> : <Fingerprint />}
      {label ?? t("auth.addPasskey") ?? "Add a passkey"}
    </Button>
  );
}

export default PasskeyEnrollButton;
