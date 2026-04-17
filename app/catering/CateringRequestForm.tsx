"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  CheckCircle2,
  PartyPopper,
  AlertCircle,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  submitCateringRequest,
  getCateringSlotAvailability,
  type SlotAvailability,
} from "@/app/actions/catering";

const schema = z
  .object({
    fullName: z.string().min(1, "Required"),
    email: z.string().email(),
    phone: z.string().min(7),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    // Optional — when both slots are taken the customer submits with no slot
    // and the owner follows up to arrange a custom time.
    eventTimeSlot: z.enum(["12:00", "16:00"]).nullable().optional(),
    guestCount: z.coerce.number().int().min(10).optional().default(10),
    estimatedLbs: z.coerce.number().min(10, "Minimum 10 lbs"),
    eventType: z.string().optional().or(z.literal("")),
    eventLocation: z.string().optional().or(z.literal("")),
    cutsPreference: z.string().optional().or(z.literal("")),
    includesSides: z.boolean(),
    deliveryNeeded: z.boolean(),
    // Stored as a string in the form state to avoid NaN from an empty number
    // input; we coerce at submit time.
    deliveryMiles: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  });

type FormData = z.infer<typeof schema>;

function computeDeliveryFee(miles: number): number {
  return Math.max(0, miles - 10) * 2;
}

function minEventDate(): string {
  // today + 3 days, in local-date YYYY-MM-DD
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CateringRequestForm() {
  const { t, i18n } = useTranslation();
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<{
    reference: string;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      eventDate: "",
      eventTimeSlot: "12:00",
      guestCount: 10,
      estimatedLbs: 10,
      eventType: "",
      eventLocation: "",
      cutsPreference: "",
      includesSides: true,
      deliveryNeeded: false,
      deliveryMiles: "",
      notes: "",
    },
  });

  const includesSides = form.watch("includesSides");
  const deliveryNeeded = form.watch("deliveryNeeded");
  const deliveryMilesStr = form.watch("deliveryMiles") ?? "";
  const eventDateValue = form.watch("eventDate");
  const selectedSlot = form.watch("eventTimeSlot");

  // --- Slot availability: debounced refetch whenever eventDate changes ------
  const [availability, setAvailability] = React.useState<SlotAvailability>({
    noon: true,
    fourpm: true,
  });
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);

  React.useEffect(() => {
    if (!eventDateValue || !/^\d{4}-\d{2}-\d{2}$/.test(eventDateValue)) {
      setAvailability({ noon: true, fourpm: true });
      return;
    }
    const date = eventDateValue;
    setAvailabilityLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await getCateringSlotAvailability(date);
        // Guard against stale responses if the user changed the date again.
        if (form.getValues("eventDate") === date) {
          setAvailability(res);
          // If the currently-selected slot just became unavailable, flip
          // selection off so the user re-picks intentionally.
          const current = form.getValues("eventTimeSlot");
          if (current === "12:00" && !res.noon) {
            form.setValue(
              "eventTimeSlot",
              res.fourpm ? "16:00" : null,
              { shouldDirty: true },
            );
          } else if (current === "16:00" && !res.fourpm) {
            form.setValue(
              "eventTimeSlot",
              res.noon ? "12:00" : null,
              { shouldDirty: true },
            );
          }
          // If both are taken, force slot to null ("custom time" mode).
          if (!res.noon && !res.fourpm) {
            form.setValue("eventTimeSlot", null, { shouldDirty: true });
          }
        }
      } finally {
        if (form.getValues("eventDate") === date) {
          setAvailabilityLoading(false);
        }
      }
    }, 300);
    return () => clearTimeout(handle);
    // form is a stable ref from useForm; eventDateValue is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDateValue]);

  const bothTaken = !availability.noon && !availability.fourpm;

  // --- Delivery fee (live) --------------------------------------------------
  const deliveryMilesNum = React.useMemo(() => {
    const n = Number(deliveryMilesStr);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [deliveryMilesStr]);
  const deliveryFee =
    deliveryMilesNum !== null ? computeDeliveryFee(deliveryMilesNum) : null;

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // If both slots are taken we intentionally submit with slot=null
      // (custom-time request). Otherwise keep what the user picked.
      const slotForSubmit: "12:00" | "16:00" | null =
        bothTaken ? null : (data.eventTimeSlot ?? "12:00");

      const milesNum = (() => {
        if (!data.deliveryNeeded) return null;
        const s = (data.deliveryMiles ?? "").trim();
        if (s === "") return null;
        const n = Number(s);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })();

      const res = await submitCateringRequest({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        eventDate: data.eventDate,
        eventTimeSlot: slotForSubmit,
        // Auto-computed: ~2 guests per lb (rule of thumb), floored at 10
        guestCount: Math.max(10, Math.ceil(Number(data.estimatedLbs) * 2)),
        estimatedLbs: Number(data.estimatedLbs),
        eventType: data.eventType || null,
        eventLocation: data.eventLocation || null,
        cutsPreference: data.cutsPreference || null,
        includesSides: data.includesSides,
        deliveryNeeded: data.deliveryNeeded,
        deliveryMiles: milesNum,
        notes: data.notes || null,
        locale: (i18n.resolvedLanguage || "es").startsWith("en") ? "en" : "es",
      });
      if (res.success && res.reference) {
        setSubmitted({ reference: res.reference });
      } else if (res.error === "slot_taken") {
        // Another customer grabbed the slot between our availability check
        // and our insert — refresh availability and ask the user to re-pick.
        toast.error(
          t(
            "catering.form.slotJustTaken",
            "That slot was just booked by someone else. Please pick another.",
          ),
        );
        try {
          const fresh = await getCateringSlotAvailability(data.eventDate);
          setAvailability(fresh);
          if (!fresh.noon && !fresh.fourpm) {
            form.setValue("eventTimeSlot", null, { shouldDirty: true });
          } else if (!fresh.noon) {
            form.setValue("eventTimeSlot", "16:00", { shouldDirty: true });
          } else if (!fresh.fourpm) {
            form.setValue("eventTimeSlot", "12:00", { shouldDirty: true });
          }
        } catch {
          // ignore — the user still sees the toast
        }
      } else {
        toast.error(
          res.reason ?? res.error ?? t("common.error", "Something went wrong"),
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t("common.error", "Something went wrong"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-oro/50 bg-papel-warm p-8 text-center shadow-cazo-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-nopal text-oro">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="font-display text-3xl font-bold text-mole">
            {t("catering.success.title", "Got it!")}
          </h2>
          <p className="mt-3 text-mole/80">
            {t(
              "catering.success.body",
              "Don Nico will text or email you within 24 hours to plan your event.",
            )}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-nopal/20 bg-papel px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-nopal" />
            <span className="font-mono text-lg font-bold text-mole">
              {submitted.reference}
            </span>
          </div>
          <p className="mt-4 text-xs text-mole/60">
            {t(
              "catering.success.hint",
              "Save this reference — keep it handy for quick questions.",
            )}
          </p>
        </div>
      </section>
    );
  }

  const minDate = minEventDate();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12" id="catering-form">
      <div className="rounded-2xl border border-nopal/15 bg-papel-warm/50 p-6 md:p-8 shadow-cazo-1">
        <h2 className="font-display text-3xl font-bold text-mole mb-2">
          {t("catering.form.title", "Request a quote")}
        </h2>
        <p className="text-mole/70 mb-4">
          {t(
            "catering.form.subtitle",
            "Tell us about your event — we'll text or email you back within 24 hours.",
          )}
        </p>

        {/* Drop-off disclaimer near the title */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-nopal/20 bg-nopal/5 p-3 text-sm text-mole/85">
          <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-nopal" />
          <p>
            {t(
              "catering.dropOffDisclaimer",
              "Don Nico delivers carnitas ready to serve — plating and service are up to you.",
            )}
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {/* Name */}
          <div className="md:col-span-2">
            <Label htmlFor="fullName">
              {t("catering.form.fullName", "Full name")} *
            </Label>
            <Input id="fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName && (
              <p className="mt-1 text-xs text-chile">
                {t("errors.required", "This field is required")}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">
              {t("catering.form.email", "Email")} *
            </Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-chile">
                {t("errors.invalidEmail", "Invalid email address")}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">
              {t("catering.form.phone", "Phone")} *
            </Label>
            <Input id="phone" type="tel" {...form.register("phone")} />
            {form.formState.errors.phone && (
              <p className="mt-1 text-xs text-chile">
                {t("errors.invalidPhone", "Invalid phone number")}
              </p>
            )}
          </div>

          {/* Event date */}
          <div>
            <Label htmlFor="eventDate">
              {t("catering.form.eventDate", "Event date")} *
            </Label>
            <Input
              id="eventDate"
              type="date"
              min={minDate}
              {...form.register("eventDate")}
            />
            <p className="mt-1 text-xs text-mole/60">
              {t("catering.form.eventDateHint", "At least 3 days from today.")}
            </p>
            {form.formState.errors.eventDate && (
              <p className="mt-1 text-xs text-chile">
                {form.formState.errors.eventDate.message}
              </p>
            )}
          </div>

          {/* Event time slot */}
          <div>
            <Label>
              {t("catering.form.eventTimeSlot", "Pickup / delivery time")}
              {!bothTaken ? " *" : null}
            </Label>

            {bothTaken ? (
              <div
                role="status"
                className="mt-1.5 flex items-start gap-3 rounded-md border border-jamaica/40 bg-jamaica/10 p-3 text-sm"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-jamaica" />
                <div>
                  <p className="font-semibold text-jamaica">
                    {t(
                      "catering.form.bothSlotsTakenTitle",
                      "Both slots booked for this date",
                    )}
                  </p>
                  <p className="mt-1 text-mole/80">
                    {t(
                      "catering.form.bothSlotsTakenBody",
                      "Submit your request — Don Nico will contact you within 24 hours to arrange a custom time.",
                    )}
                  </p>
                  <p className="mt-2 inline-flex items-center rounded-md bg-jamaica/15 px-2 py-0.5 text-xs font-semibold text-jamaica">
                    {t(
                      "catering.form.customTimeBadge",
                      "Custom time — we'll call you",
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["12:00", "16:00"] as const).map((slot) => {
                  const selected = selectedSlot === slot;
                  const open =
                    slot === "12:00" ? availability.noon : availability.fourpm;
                  const baseLabel =
                    slot === "12:00"
                      ? t("catering.form.slotNoon", "12:00 PM")
                      : t("catering.form.slot4pm", "4:00 PM");
                  return (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => {
                        if (!open) return;
                        form.setValue("eventTimeSlot", slot, {
                          shouldDirty: true,
                        });
                      }}
                      disabled={!open}
                      className={
                        "flex flex-col items-start rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                        (!open
                          ? "cursor-not-allowed border-nopal/10 bg-papel/40 text-mole/40"
                          : selected
                            ? "border-oro bg-oro text-mole"
                            : "border-nopal/20 bg-papel text-mole hover:bg-papel-warm")
                      }
                      aria-pressed={selected}
                      aria-disabled={!open}
                    >
                      <span>{baseLabel}</span>
                      <span
                        className={
                          "mt-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                          (!open
                            ? "text-jamaica"
                            : selected
                              ? "text-mole/70"
                              : "text-nopal")
                        }
                      >
                        {!open
                          ? t("catering.form.slotTaken", "Taken")
                          : t("catering.form.slotAvailable", "Open")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-1 text-xs text-mole/60">
              {availabilityLoading
                ? t(
                    "catering.form.checkingAvailability",
                    "Checking availability…",
                  )
                : t(
                    "catering.form.eventTimeHint",
                    "Two slots daily: 12:00 PM or 4:00 PM.",
                  )}
            </p>
            {form.formState.errors.eventTimeSlot && (
              <p className="mt-1 text-xs text-chile">
                {form.formState.errors.eventTimeSlot.message}
              </p>
            )}
          </div>

          {/* Estimated lbs */}
          <div>
            <Label htmlFor="estimatedLbs">
              {t("catering.form.estimatedLbs", "Estimated lbs")} *
            </Label>
            <Input
              id="estimatedLbs"
              type="number"
              min={10}
              step={0.5}
              {...form.register("estimatedLbs", { valueAsNumber: true })}
            />
            <p className="mt-1 text-xs text-mole/60">
              {t(
                "catering.form.estimatedLbsHint",
                "Rule of thumb: ~1/2 lb per guest, more for big eaters.",
              )}
            </p>
            {form.formState.errors.estimatedLbs && (
              <p className="mt-1 text-xs text-chile">
                {form.formState.errors.estimatedLbs.message}
              </p>
            )}
          </div>

          {/* Event type */}
          <div>
            <Label htmlFor="eventType">
              {t("catering.form.eventType", "Event type")}
            </Label>
            <Input
              id="eventType"
              list="catering-event-types"
              placeholder={t(
                "catering.form.eventTypePlaceholder",
                "e.g. Wedding, Quinceañera",
              )}
              {...form.register("eventType")}
            />
            <datalist id="catering-event-types">
              <option value={t("catering.form.eventTypes.wedding", "Wedding")} />
              <option
                value={t("catering.form.eventTypes.quinceanera", "Quinceañera")}
              />
              <option
                value={t("catering.form.eventTypes.corporate", "Corporate")}
              />
              <option
                value={t("catering.form.eventTypes.graduation", "Graduation")}
              />
              <option
                value={t("catering.form.eventTypes.birthday", "Birthday")}
              />
              <option value={t("catering.form.eventTypes.other", "Other")} />
            </datalist>
          </div>

          {/* Event location */}
          <div className="md:col-span-2">
            <Label htmlFor="eventLocation">
              {t("catering.form.eventLocation", "Event location")}
            </Label>
            <Textarea
              id="eventLocation"
              rows={2}
              placeholder={t(
                "catering.form.eventLocationPlaceholder",
                "Address or just the city — we can sort details later.",
              )}
              {...form.register("eventLocation")}
            />
          </div>

          {/* Cuts preference */}
          <div className="md:col-span-2">
            <Label htmlFor="cutsPreference">
              {t("catering.form.cutsPreference", "Cut preferences")}
            </Label>
            <Input
              id="cutsPreference"
              placeholder={t(
                "catering.form.cutsPreferencePlaceholder",
                "Maciza, Surtido, mix — or let Don Nico decide",
              )}
              {...form.register("cutsPreference")}
            />
          </div>

          {/* Includes sides */}
          <div className="md:col-span-2 rounded-lg border border-nopal/10 bg-papel/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="includesSides" className="text-base">
                  {t("catering.form.includesSides", "Include sides?")}
                </Label>
                <p className="mt-1 text-xs text-mole/60">
                  {t(
                    "catering.form.includesSidesHint",
                    "Tortillas, salsas, pico de gallo, cebolla, cilantro, limes.",
                  )}
                </p>
              </div>
              <Switch
                id="includesSides"
                checked={includesSides}
                onCheckedChange={(v) =>
                  form.setValue("includesSides", v, { shouldDirty: true })
                }
              />
            </div>
          </div>

          {/* Delivery needed */}
          <div className="md:col-span-2 rounded-lg border border-nopal/10 bg-papel/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="deliveryNeeded" className="text-base">
                  {t("catering.form.deliveryNeeded", "Delivery needed?")}
                </Label>
                <p className="mt-1 text-xs text-mole/60">
                  {t(
                    "catering.form.deliveryNeededHint",
                    "First 10 miles free. After that, $2/mi. We drop off the food ready to serve — we don't stay.",
                  )}
                </p>
                <p className="mt-1 text-xs font-medium text-nopal">
                  {t(
                    "catering.form.dropOffNote",
                    "Drop-off only — we don't stay to serve.",
                  )}
                </p>
              </div>
              <Switch
                id="deliveryNeeded"
                checked={deliveryNeeded}
                onCheckedChange={(v) =>
                  form.setValue("deliveryNeeded", v, { shouldDirty: true })
                }
              />
            </div>

            {/* Miles input + live fee — only when delivery is needed */}
            {deliveryNeeded ? (
              <div className="mt-4 border-t border-nopal/10 pt-4">
                <Label htmlFor="deliveryMiles">
                  {t("catering.form.milesLabel", "Distance (miles)")}
                </Label>
                <Input
                  id="deliveryMiles"
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  placeholder={t(
                    "catering.form.milesPlaceholder",
                    "Approximate miles from ZIP 78640",
                  )}
                  {...form.register("deliveryMiles")}
                />
                <p className="mt-1 text-xs text-mole/60">
                  {t(
                    "catering.form.milesHint",
                    "First 10 mi free. After that, $2/mi.",
                  )}
                </p>

                {deliveryFee !== null ? (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-oro/10 px-3 py-1.5 text-sm font-semibold text-mole">
                    {deliveryFee === 0 ? (
                      <span>
                        {t(
                          "catering.form.feeFree",
                          "Free (within 10 mi)",
                        )}
                      </span>
                    ) : (
                      <span>
                        {t("catering.form.feeEstimate", {
                          defaultValue: "Estimated delivery: {{fee}}",
                          fee: `$${deliveryFee.toFixed(2)}`,
                        })}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <Label htmlFor="notes">
              {t("catering.form.notes", "Anything else?")}
            </Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder={t(
                "catering.form.notesPlaceholder",
                "Timing, dietary restrictions, allergies, special requests...",
              )}
              {...form.register("notes")}
            />
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              variant="oro"
              size="xl"
              className="w-full"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("catering.form.submit", "Send request")}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
