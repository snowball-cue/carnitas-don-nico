"use client";

import * as React from "react";
import { Download, Share } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Lightweight platform detection for the install affordance. */
function getPlatform(): "android" | "ios" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari specific flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function InstallPrompt({
  className,
  variant = "pill",
}: {
  className?: string;
  /**
   * - "pill"   — oro background, icon + text (default; customer header desktop).
   * - "ghost"  — transparent, icon-only, fits dark backgrounds (admin top bar
   *               or any compact mobile placement). Includes an sr-only label
   *               for accessibility.
   */
  variant?: "pill" | "ghost";
}) {
  const { t } = useTranslation();
  const [deferredEvent, setDeferredEvent] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [iosHelpOpen, setIosHelpOpen] = React.useState(false);
  const [platform, setPlatform] = React.useState<
    "android" | "ios" | "desktop" | "unknown"
  >("unknown");

  React.useEffect(() => {
    setPlatform(getPlatform());
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Don't render anything when already installed/running standalone.
  if (installed) return null;

  // Don't render on desktop unless an install prompt is actually available
  // (most desktop browsers offer their own URL-bar install button).
  if (platform === "desktop" && !deferredEvent) return null;

  const handleClick = async () => {
    if (deferredEvent) {
      try {
        await deferredEvent.prompt();
        const { outcome } = await deferredEvent.userChoice;
        if (outcome === "accepted") setInstalled(true);
      } finally {
        setDeferredEvent(null);
      }
      return;
    }
    if (platform === "ios") {
      setIosHelpOpen(true);
      return;
    }
  };

  // iOS Safari never fires beforeinstallprompt — but we still want to surface
  // the affordance, just routed to the instructions dialog.
  const visible = deferredEvent !== null || platform === "ios";
  if (!visible) return null;

  const isGhost = variant === "ghost";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={cn(
          isGhost
            ? "inline-flex h-10 w-10 items-center justify-center rounded-md text-papel hover:bg-papel/10"
            : "inline-flex h-9 items-center gap-1.5 rounded-full bg-oro px-3 text-sm font-semibold text-mole shadow-sm transition-colors hover:bg-oro/90",
          className,
        )}
        aria-label={t("install.cta", "Install app")}
      >
        <Download className={isGhost ? "h-5 w-5" : "h-4 w-4"} />
        {isGhost ? (
          <span className="sr-only">{t("install.cta", "Install app")}</span>
        ) : (
          <span>{t("install.cta", "Install app")}</span>
        )}
      </button>

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("install.iosTitle", "Add to Home Screen")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "install.iosDescription",
                "Install Carnitas Don Nico on your iPhone for one-tap re-ordering.",
              )}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-base text-mole">
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-oro/30 font-display text-mole">
                1
              </span>
              <span className="pt-1">
                {t("install.iosStep1Prefix", "Tap the Share button")}{" "}
                <Share
                  className="inline h-5 w-5 align-text-bottom text-nopal"
                  aria-hidden
                />{" "}
                {t(
                  "install.iosStep1Suffix",
                  "at the bottom of Safari.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-oro/30 font-display text-mole">
                2
              </span>
              <span className="pt-1">
                {t(
                  "install.iosStep2",
                  'Scroll and tap "Add to Home Screen".',
                )}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-oro/30 font-display text-mole">
                3
              </span>
              <span className="pt-1">
                {t(
                  "install.iosStep3",
                  'Tap "Add" — the carnitas icon appears on your home screen.',
                )}
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InstallPrompt;
