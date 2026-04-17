"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import PasskeyEnrollButton from "@/components/auth/PasskeyEnrollButton";
import WebAuthnSupportedGuard from "@/components/auth/WebAuthnSupportedGuard";

export default function WelcomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [passkeyDone, setPasskeyDone] = React.useState(false);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-papel-warm bg-papel-warm p-8 shadow-cazo-1">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="lg" priority />
          <h1 className="font-display text-3xl text-mole">
            {t("welcome.title") ?? "¡Bienvenido a Don Nico!"}
          </h1>
          <p className="max-w-sm text-sm text-mole/70">
            {t("welcome.subtitle") ??
              "Thanks for joining us. Two quick steps and you're ready to order."}
          </p>
        </div>

        <ol className="mt-8 space-y-4">
          <WebAuthnSupportedGuard
            fallback={
              <li className="rounded-md border border-papel/70 bg-papel px-4 py-3 text-sm text-mole/60">
                {t("welcome.passkeyUnsupported") ??
                  "Your browser doesn't support passkeys — you can skip this."}
              </li>
            }
          >
            <li className="rounded-md border border-papel/70 bg-papel p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nopal text-papel">
                  {passkeyDone ? <Check className="size-5" /> : <Fingerprint className="size-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg text-mole">
                    {t("welcome.step1Title") ?? "Add a passkey"}
                  </p>
                  <p className="text-xs text-mole/60">
                    {t("welcome.step1Body") ??
                      "Sign in with Face ID, Touch ID or Windows Hello next time. No passwords."}
                  </p>
                </div>
              </div>
              {passkeyDone ? (
                <p className="text-sm text-nopal-dark">
                  {t("welcome.passkeyDone") ?? "Passkey saved!"}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <PasskeyEnrollButton
                    onEnrolled={() => setPasskeyDone(true)}
                    variant="oro"
                    size="default"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPasskeyDone(true)}
                  >
                    {t("welcome.skip") ?? "Skip"}
                  </Button>
                </div>
              )}
            </li>
          </WebAuthnSupportedGuard>

          <li className="rounded-md border border-papel/70 bg-papel p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-oro text-mole">
                <ChevronRight className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-display text-lg text-mole">
                  {t("welcome.step2Title") ?? "Explore the menu"}
                </p>
                <p className="text-xs text-mole/60">
                  {t("welcome.step2Body") ??
                    "Pick your pound of carnitas and reserve a pickup window."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => router.push("/menu")}
              className="w-full"
            >
              {t("welcome.goToMenu") ?? "Go to the menu"}
              <ArrowRight />
            </Button>
          </li>
        </ol>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="text-mole/60 underline-offset-4 hover:text-nopal hover:underline"
          >
            {t("welcome.skipForNow") ?? "Skip for now"}
          </Link>
        </div>
      </div>
    </div>
  );
}
