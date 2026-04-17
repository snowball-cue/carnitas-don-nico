"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { upsertPickupDate, deletePickupDate } from "@/app/actions/admin/calendar";
import { sendOwnerNotification } from "@/app/actions/admin/notifications";
import type { PickupDateRow } from "@/types/database";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

interface FormState {
  id?: string;
  pickup_date: string;
  capacity_lbs: string;
  pickup_window_start: string;
  pickup_window_end: string;
  cutoff_at: string; // yyyy-MM-ddTHH:mm
  is_open: boolean;
  notes_en: string;
  notes_es: string;
}

function emptyForm(date: Date): FormState {
  const cutoff = new Date(date);
  cutoff.setDate(cutoff.getDate() - 1);
  cutoff.setHours(18, 0, 0, 0);
  return {
    pickup_date: ymd(date),
    capacity_lbs: "50",
    pickup_window_start: "11:00",
    pickup_window_end: "14:00",
    cutoff_at: format(cutoff, "yyyy-MM-dd'T'HH:mm"),
    is_open: true,
    notes_en: "",
    notes_es: "",
  };
}

export default function AdminCalendarPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => getClient(), []);
  const [pickups, setPickups] = React.useState<PickupDateRow[]>([]);
  const [selected, setSelected] = React.useState<Date>(new Date());
  const [form, setForm] = React.useState<FormState>(emptyForm(new Date()));
  const [pending, startTransition] = React.useTransition();
  const [orderCount, setOrderCount] = React.useState<number>(0);

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("pickup_dates")
      .select("*")
      .order("pickup_date", { ascending: true });
    setPickups((data as PickupDateRow[]) ?? []);
  }, [supabase]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const key = ymd(selected);
    const existing = pickups.find((p) => p.pickup_date === key);
    if (existing) {
      setForm({
        id: existing.id,
        pickup_date: existing.pickup_date,
        capacity_lbs: String(existing.capacity_lbs),
        pickup_window_start: existing.pickup_window_start.slice(0, 5),
        pickup_window_end: existing.pickup_window_end.slice(0, 5),
        cutoff_at: format(new Date(existing.cutoff_at), "yyyy-MM-dd'T'HH:mm"),
        is_open: existing.is_open,
        notes_en: existing.notes_en ?? "",
        notes_es: existing.notes_es ?? "",
      });
      void (async () => {
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("pickup_date_id", existing.id)
          .not("status", "in", "(cancelled,no_show)");
        setOrderCount(count ?? 0);
      })();
    } else {
      setForm(emptyForm(selected));
      setOrderCount(0);
    }
  }, [selected, pickups, supabase]);

  const onSave = () =>
    startTransition(async () => {
      const res = await upsertPickupDate({
        id: form.id,
        pickup_date: form.pickup_date,
        capacity_lbs: Number(form.capacity_lbs),
        pickup_window_start: form.pickup_window_start,
        pickup_window_end: form.pickup_window_end,
        cutoff_at: new Date(form.cutoff_at).toISOString(),
        is_open: form.is_open,
        notes_en: form.notes_en || null,
        notes_es: form.notes_es || null,
      });
      if (res.success) {
        toast.success(t("admin.calendar.saved"));
        void load();
      } else toast.error(res.error ?? t("common.error"));
    });

  const onDelete = () =>
    startTransition(async () => {
      if (!form.id) return;
      const res = await deletePickupDate(form.id);
      if (res.success) {
        toast.success(t("admin.calendar.deleted"));
        void load();
      } else toast.error(res.error ?? t("common.error"));
    });

  const onNotify = () =>
    startTransition(async () => {
      const res = await sendOwnerNotification({
        type: "pickup_reminder",
        title: t("admin.calendar.notifyTitle", {
          date: format(new Date(`${form.pickup_date}T12:00:00`), "PPP"),
        }),
        body: t("admin.calendar.notifyBody"),
        metadata: { pickup_date: form.pickup_date },
      });
      if (res.success) toast.success(t("admin.calendar.notifyStub"));
      else toast.error(res.error ?? t("common.error"));
    });

  const pickupDates = React.useMemo(
    () => pickups.map((p) => new Date(`${p.pickup_date}T12:00:00`)),
    [pickups],
  );

  const existing = pickups.find((p) => p.pickup_date === ymd(selected));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-mole">
        {t("admin.calendar.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.calendar.selectDate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
              modifiers={{ pickup: pickupDates }}
              modifiersClassNames={{
                pickup: "bg-oro/30 text-mole font-semibold rounded-md",
              }}
            />
            <p className="text-xs text-mole/60 mt-2">
              {t("admin.calendar.legend")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {existing
                ? t("admin.calendar.editTitle")
                : t("admin.calendar.createTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {existing ? (
              <div className="rounded-md bg-papel p-3 text-sm text-mole/80">
                <p>
                  <span className="font-semibold text-mole">
                    {Number(existing.reserved_lbs).toFixed(1)}
                  </span>{" "}
                  / {Number(existing.capacity_lbs).toFixed(1)} lbs
                </p>
                <p className="text-xs">
                  {t("admin.calendar.pendingOrders", { count: orderCount })}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="capacity">
                  {t("admin.calendar.capacityLbs")}
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  step="0.5"
                  value={form.capacity_lbs}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, capacity_lbs: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="cutoff">{t("admin.calendar.cutoffAt")}</Label>
                <Input
                  id="cutoff"
                  type="datetime-local"
                  value={form.cutoff_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cutoff_at: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="wstart">{t("admin.calendar.windowStart")}</Label>
                <Input
                  id="wstart"
                  type="time"
                  value={form.pickup_window_start}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pickup_window_start: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="wend">{t("admin.calendar.windowEnd")}</Label>
                <Input
                  id="wend"
                  type="time"
                  value={form.pickup_window_end}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pickup_window_end: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_open"
                checked={form.is_open}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_open: v }))}
              />
              <Label htmlFor="is_open">{t("admin.calendar.isOpen")}</Label>
            </div>

            <div>
              <Label htmlFor="notes_en">{t("admin.calendar.notesEn")}</Label>
              <Textarea
                id="notes_en"
                rows={2}
                value={form.notes_en}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes_en: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="notes_es">{t("admin.calendar.notesEs")}</Label>
              <Textarea
                id="notes_es"
                rows={2}
                value={form.notes_es}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes_es: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={onSave} disabled={pending}>
                {existing ? t("common.save") : t("admin.calendar.create")}
              </Button>
              {existing ? (
                <Button
                  variant="oro"
                  onClick={onNotify}
                  disabled={pending}
                  type="button"
                >
                  {t("admin.calendar.notifySubscribers")}
                </Button>
              ) : null}
              {existing ? (
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={pending}
                  type="button"
                  className="ml-auto"
                >
                  {t("common.delete")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
