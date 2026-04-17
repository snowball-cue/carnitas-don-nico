"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calendar, Info } from "lucide-react";
import { formatCurrency, formatLbs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/lib/stores/cart";
import { getPickupDate } from "@/app/actions/pickup";
import { createOrder } from "@/app/actions/orders";
import type { PickupDateRow } from "@/types/database";
import { PickupSwitcher } from "@/app/cart/PickupSwitcher";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function GuestCheckoutPage() {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";
  const router = useRouter();
  const sp = useSearchParams();

  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const totalLbs = useCartStore((s) => s.totalLbs());
  const pickupDateId = useCartStore((s) => s.pickup_date_id);
  const clear = useCartStore((s) => s.clear);

  const tipAmount = Number(sp.get("tip") ?? "0") || 0;
  const total = subtotal + tipAmount;

  const [pickup, setPickup] = React.useState<PickupDateRow | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  React.useEffect(() => {
    if (lines.length === 0 && !submitting) router.replace("/menu");
  }, [lines.length, router, submitting]);

  React.useEffect(() => {
    let active = true;
    if (!pickupDateId) return;
    getPickupDate(pickupDateId).then((r) => {
      if (active && r.success && r.data) setPickup(r.data);
    });
    return () => {
      active = false;
    };
  }, [pickupDateId]);

  const onSubmit = async (data: FormData) => {
    if (!pickupDateId) {
      setErrorMsg(
        t("checkout.missingPickup", "Please select a pickup date first")
      );
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    const res = await createOrder({
      cart: lines,
      pickupDateId,
      tip: tipAmount,
      paymentMethod: "pay_in_person",
      customerInfo: {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
      },
      isGuest: true,
      notes: data.notes,
    });

    if (res.success && res.orderNumber) {
      clear();
      const phone = encodeURIComponent(data.phone);
      router.push(
        `/checkout/confirmation/${res.orderNumber}?guest=1&phone=${phone}`
      );
    } else {
      setErrorMsg(res.error ?? t("common.error", "Something went wrong"));
      setSubmitting(false);
    }
  };

  const pickupLabel = pickup
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date(`${pickup.pickup_date}T00:00:00`))
    : null;
  const pickupTimeLabel = pickup
    ? `${pickup.pickup_window_start.slice(0, 5)} – ${pickup.pickup_window_end.slice(0, 5)}`
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-mole mb-2">
        {t("checkout.guestTitle", "Continue as Guest")}
      </h1>
      <p className="text-sm text-mole/70 mb-6">
        {t(
          "checkout.guestSubtitle",
          "No account needed. We'll text you your order number."
        )}
      </p>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-oro/60 bg-papel-warm px-4 py-3">
        <Info className="h-4 w-4 mt-0.5 text-nopal" />
        <p className="text-sm text-mole">
          {t(
            "checkout.guestDisclaimer",
            "Save your order number! Track it at /orders/track/[order]. We'll also text you the link."
          )}
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
      >
        <div className="space-y-6">
          <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5">
            <h2 className="font-display text-xl font-semibold text-mole mb-4">
              {t("checkout.customerInfo", "Your information")}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">
                  {t("checkout.nameLabel", "Full name")}
                </Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-chile mt-1">
                    {t("errors.required", "This field is required")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">
                  {t("checkout.phoneLabel", "Phone number")} *
                </Label>
                <Input id="phone" type="tel" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="text-xs text-chile mt-1">
                    {t("errors.invalidPhone", "Invalid phone number")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">
                  {t("checkout.emailLabel", "Email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("checkout.emailPlaceholder", "you@example.com")}
                  {...form.register("email")}
                />
                <p className="text-xs text-mole/60 mt-1">
                  {t(
                    "checkout.emailHint",
                    "We'll send your receipt + a pickup reminder the day before.",
                  )}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">
                  {t("checkout.notesLabel", "Special instructions")}
                </Label>
                <Textarea id="notes" rows={2} {...form.register("notes")} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-mole">
                {t("checkout.pickup", "Pickup")}
              </h2>
              <PickupSwitcher>
                <button type="button" className="text-sm text-nopal underline hover:text-nopal-dark">
                  {t("common.change", "Change")}
                </button>
              </PickupSwitcher>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <Calendar className="h-5 w-5 text-nopal mt-0.5" />
              <div>
                {pickupLabel ? (
                  <>
                    <p className="font-medium text-mole capitalize">
                      {pickupLabel}
                    </p>
                    <p className="text-sm text-mole/70">{pickupTimeLabel}</p>
                  </>
                ) : (
                  <p className="text-sm text-chile">
                    {t("checkout.missingPickup", "Please select a pickup date first")}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-nopal/10 bg-papel-warm/40 p-5">
            <h2 className="font-display text-xl font-semibold text-mole mb-2">
              {t("checkout.guestPaymentTitle", "Payment — pay in person")}
            </h2>
            <p className="text-sm text-mole/70">
              {t(
                "checkout.guestPaymentBody",
                "Guest orders are paid in person on pickup day (cash, Zelle, Venmo, or CashApp). The owner will confirm your reservation by text."
              )}
            </p>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-nopal/10 bg-papel-warm p-4">
            <h3 className="font-display text-lg font-semibold text-mole mb-3">
              {t("checkout.orderSummary", "Order summary")}
            </h3>
            <ul className="space-y-2 mb-3">
              {lines.map((l) => {
                const name = isEs ? l.name_es : l.name_en;
                const variant = isEs ? l.variant_name_es : l.variant_name_en;
                const qty =
                  l.unit === "lb"
                    ? formatLbs(l.quantity, locale)
                    : `x${l.quantity}`;
                return (
                  <li
                    key={l.id}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {qty} {name}
                      {variant && ` · ${variant}`}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(l.line_total, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Separator />
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-mole/70">
                  {t("cart.subtotal", "Subtotal")}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(subtotal, locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mole/70">{t("cart.tip", "Tip")}</span>
                <span className="tabular-nums">
                  {formatCurrency(tipAmount, locale)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2">
                <span>{t("cart.total", "Total")}</span>
                <span className="tabular-nums">
                  {formatCurrency(total, locale)}
                </span>
              </div>
              {totalLbs > 0 && (
                <p className="text-xs text-mole/60 pt-1">
                  {formatLbs(totalLbs, locale)}{" "}
                  {t("checkout.reservedOf", "reserved")}
                </p>
              )}
            </div>
            {errorMsg && (
              <p className="mt-3 rounded bg-chile/10 px-3 py-2 text-sm text-chile">
                {errorMsg}
              </p>
            )}
            <Button
              type="submit"
              variant="oro"
              size="xl"
              className="w-full mt-4"
              disabled={submitting || !pickupDateId}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("checkout.placeGuestOrder", "Reserve My Order")}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
