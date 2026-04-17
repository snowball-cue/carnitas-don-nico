"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Loader2, KeyRound, LogOut, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/lib/hooks/useUser";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useUser();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [marketingOptIn, setMarketingOptIn] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  type P = {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    referral_code?: string;
    loyalty_points?: number;
    marketing_opt_in?: boolean;
  };
  const p = (profile ?? {}) as P;

  React.useEffect(() => {
    if (!profile) return;
    setName(p.full_name ?? "");
    setPhone(p.phone ?? "");
    setEmail(p.email ?? "");
    setMarketingOptIn(Boolean(p.marketing_opt_in));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  React.useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/sign-in?next=/account");
  }, [isLoading, user, router]);

  const referralCode = p.referral_code ?? "";
  const loyaltyPoints = p.loyalty_points ?? 0;
  const APP_URL =
    (typeof window !== "undefined" && window.location.origin) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const referralLink = referralCode
    ? `${APP_URL}/?ref=${referralCode}`
    : "";

  const onCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("account.copied", "{{label}} copied", { label }));
    } catch {
      toast.error("Copy failed");
    }
  };

  const onShare = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Carnitas Don Nico",
          text: "Order with my link!",
          url: referralLink,
        });
      } else {
        await onCopy(referralLink, "Link");
      }
    } catch {
      /* noop */
    }
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("customer_profiles")
      .update({
        full_name: name || null,
        phone: phone || null,
        email: email || null,
        marketing_opt_in: marketingOptIn,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("account.saved", "Profile saved"));
    }
  };

  const onSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-nopal" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-mole mb-6">
        {t("profile.title", "Account")}
      </h1>

      <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5 mb-6">
        <h2 className="font-display text-lg font-semibold text-mole mb-4">
          {t("account.info", "Your information")}
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">{t("profile.fullName", "Full name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">{t("profile.phone", "Phone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">{t("profile.email", "Email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="oro"
          className="mt-4"
          onClick={onSave}
          disabled={saving}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("common.save", "Save")}
        </Button>
      </section>

      {/* Referral */}
      <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5 mb-6">
        <h2 className="font-display text-lg font-semibold text-mole mb-2">
          {t("profile.referralCode", "Your referral code")}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-nopal/20 bg-papel px-3 py-2 font-mono text-mole">
            {referralCode || "—"}
          </div>
          <Button
            variant="outline"
            onClick={() => onCopy(referralCode, "Code")}
            disabled={!referralCode}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onShare} disabled={!referralLink}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 text-sm text-mole/70">
          {t("profile.loyaltyPoints", "Loyalty points")}:{" "}
          <span className="font-bold">{loyaltyPoints}</span>
        </p>
      </section>

      {/* Preferences */}
      <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5 mb-6">
        <h2 className="font-display text-lg font-semibold text-mole mb-3">
          {t("account.preferences", "Preferences")}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {t("profile.marketingOptIn", "Marketing opt-in")}
            </p>
            <p className="text-sm text-mole/70">
              {t(
                "account.marketingDesc",
                "Send me updates about upcoming pickups"
              )}
            </p>
          </div>
          <Switch
            checked={marketingOptIn}
            onCheckedChange={(v) => {
              setMarketingOptIn(v);
            }}
          />
        </div>
        <div className="mt-3">
          <Button variant="outline" onClick={onSave} disabled={saving}>
            {t("account.savePref", "Save preferences")}
          </Button>
        </div>
      </section>

      {/* Passkey */}
      <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5 mb-6">
        <h2 className="font-display text-lg font-semibold text-mole mb-2">
          {t("account.passkey", "Passkey")}
        </h2>
        <p className="text-sm text-mole/70 mb-3">
          {t(
            "account.passkeyDesc",
            "Sign in faster next time with your device biometrics."
          )}
        </p>
        {/* TODO: Replace with auth agent's <PasskeyEnrollButton /> when available */}
        <Button variant="outline" disabled>
          <KeyRound className="h-4 w-4" />
          {t("auth.usePasskey", "Save a passkey")}
        </Button>
        <p className="text-xs text-mole/50 mt-2">
          {t("account.passkeyStub", "Coming soon")}
        </p>
      </section>

      <Separator className="my-6" />

      <div className="flex items-center justify-between">
        <Link href="/orders" className="text-sm text-nopal underline">
          {t("nav.orders", "My Orders")}
        </Link>
        <Button variant="destructive" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          {t("auth.signOut", "Sign out")}
        </Button>
      </div>
    </div>
  );
}
