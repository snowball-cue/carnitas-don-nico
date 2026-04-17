"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, ShoppingBag, Calendar } from "lucide-react";
import { cn, formatCurrency, formatLbs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty/EmptyState";
import { useCartStore } from "@/lib/stores/cart";
import { useUser } from "@/lib/hooks/useUser";
import { getPickupDate } from "@/app/actions/pickup";
import type { PickupDateRow } from "@/types/database";

const TIP_PRESETS = [0, 10, 15, 20] as const;

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";
  const router = useRouter();
  const { user, isLoading: loadingUser } = useUser();

  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const pickupDateId = useCartStore((s) => s.pickup_date_id);
  const remove = useCartStore((s) => s.remove);
  const update = useCartStore((s) => s.updateQuantity);

  const [pickup, setPickup] = React.useState<PickupDateRow | null>(null);
  const [tipPercent, setTipPercent] = React.useState<number>(0);
  const [customTip, setCustomTip] = React.useState<string>("");
  const [signInDialogOpen, setSignInDialogOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!pickupDateId) {
      setPickup(null);
      return;
    }
    getPickupDate(pickupDateId).then((r) => {
      if (active && r.success && r.data) setPickup(r.data);
    });
    return () => {
      active = false;
    };
  }, [pickupDateId]);

  const tipAmount = React.useMemo(() => {
    if (customTip) {
      const n = parseFloat(customTip);
      return isNaN(n) ? 0 : Math.max(0, n);
    }
    return Math.round(subtotal * tipPercent) / 100;
  }, [customTip, tipPercent, subtotal]);

  const total = subtotal + tipAmount;

  const onCheckoutClick = () => {
    if (loadingUser) return;
    if (user) {
      router.push(
        `/checkout?tip=${encodeURIComponent(tipAmount.toFixed(2))}`
      );
    } else {
      setSignInDialogOpen(true);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title={
            isEs ? "Tu carrito está vacío" : "Your cart is empty"
          }
          description={t(
            "cart.emptyDesc",
            "Agrega algo delicioso del menú."
          )}
          cta={
            <Button asChild variant="oro">
              <Link href="/menu">{t("cart.browseMenu", "Browse Menu")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const pickupLabel = pickup
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(new Date(`${pickup.pickup_date}T00:00:00`))
    : null;
  const pickupTimeLabel = pickup
    ? `${pickup.pickup_window_start.slice(0, 5)} – ${pickup.pickup_window_end.slice(0, 5)}`
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-mole mb-6">
        {t("cart.title", "Your Cart")}
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* Line items */}
        <ul className="divide-y divide-nopal/10 rounded-lg border border-nopal/10 bg-papel-warm/30">
          {lines.map((l) => {
            const name = isEs ? l.name_es : l.name_en;
            const variant = isEs ? l.variant_name_es : l.variant_name_en;
            return (
              <li key={l.id} className="flex gap-4 p-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-papel">
                  <Image
                    src="/brand/placeholder-menu.svg"
                    alt={name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-mole">
                        {name}
                      </h3>
                      {variant && (
                        <p className="text-sm text-mole/60">{variant}</p>
                      )}
                      <p className="text-xs text-mole/60 mt-1">
                        {formatCurrency(l.unit_price, locale)}
                        {l.unit === "lb"
                          ? ` / ${t("menu.lb", "lb")}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      aria-label={t("cart.remove", "Remove")}
                      className="rounded p-2 text-mole/50 hover:bg-papel hover:text-chile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-full border border-nopal/30 bg-papel">
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            l.id,
                            +(l.quantity - (l.unit === "lb" ? 0.5 : 1)).toFixed(2)
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-l-full hover:bg-papel-warm"
                        aria-label={t("menu.decrease", "Decrease")}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[60px] px-2 text-center text-sm font-medium tabular-nums">
                        {l.unit === "lb" ? formatLbs(l.quantity, locale) : l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            l.id,
                            +(l.quantity + (l.unit === "lb" ? 0.5 : 1)).toFixed(2)
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-r-full hover:bg-papel-warm"
                        aria-label={t("menu.increase", "Increase")}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-lg font-bold text-mole tabular-nums">
                      {formatCurrency(l.line_total, locale)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary column */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Pickup date card */}
          <div className="rounded-lg border border-nopal/10 bg-papel-warm p-4">
            <div className="flex items-center gap-2 text-mole">
              <Calendar className="h-4 w-4 text-nopal" />
              <span className="font-medium">
                {t("cart.pickupDate", "Pickup date")}
              </span>
            </div>
            {pickup ? (
              <div className="mt-2">
                <p className="font-display text-lg font-semibold text-mole capitalize">
                  {pickupLabel}
                </p>
                <p className="text-sm text-mole/70">{pickupTimeLabel}</p>
                <Link
                  href="/pickup"
                  className="text-xs text-nopal underline mt-1 inline-block"
                >
                  {t("cart.changePickup", "Change")}
                </Link>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-mole/70">
                  {t("cart.noPickupSelected", "No pickup date selected")}
                </p>
                <Link
                  href="/pickup"
                  className="text-sm text-nopal underline mt-1 inline-block"
                >
                  {t("cart.selectPickup", "Select a pickup date")}
                </Link>
              </div>
            )}
          </div>

          {/* Tip */}
          <div className="rounded-lg border border-nopal/10 bg-papel-warm p-4">
            <p className="font-medium text-mole mb-3">{t("cart.tip", "Tip")}</p>
            <div className="grid grid-cols-4 gap-2">
              {TIP_PRESETS.map((p) => {
                const active = !customTip && tipPercent === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCustomTip("");
                      setTipPercent(p);
                    }}
                    className={cn(
                      "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-oro bg-oro text-mole"
                        : "border-nopal/30 bg-papel text-mole hover:bg-papel"
                    )}
                  >
                    {p}%
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <label className="text-xs text-mole/70 block mb-1">
                {t("cart.customTip", "Custom ($)")}
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTipPercent(0);
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border border-nopal/10 bg-papel-warm p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-mole/70">{t("cart.subtotal", "Subtotal")}</span>
              <span className="tabular-nums">{formatCurrency(subtotal, locale)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-mole/70">{t("cart.tip", "Tip")}</span>
              <span className="tabular-nums">{formatCurrency(tipAmount, locale)}</span>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-lg font-bold">
              <span>{t("cart.total", "Total")}</span>
              <span className="tabular-nums">{formatCurrency(total, locale)}</span>
            </div>

            <Button
              variant="oro"
              size="xl"
              className="mt-4 w-full"
              onClick={onCheckoutClick}
              disabled={!pickupDateId}
            >
              {t("cart.continueCheckout", "Continue to Checkout")}
            </Button>
            {!pickupDateId && (
              <p className="mt-2 text-center text-xs text-chile">
                {t("cart.pickupRequired", "Please select a pickup date first")}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Sign-in or guest modal */}
      <Dialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("cart.signInOrGuestTitle", "Sign in or continue as guest")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "cart.signInOrGuestDesc",
                "Signing in saves your info for next time. Guest checkout is fastest."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link
                href={`/login?redirect=${encodeURIComponent(
                  `/checkout?tip=${tipAmount.toFixed(2)}`
                )}`}
              >
                {t("auth.signIn", "Sign in")}
              </Link>
            </Button>
            <Button asChild variant="oro">
              <Link
                href={`/checkout/guest?tip=${encodeURIComponent(tipAmount.toFixed(2))}`}
              >
                {t("cart.continueAsGuest", "Continue as guest")}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
