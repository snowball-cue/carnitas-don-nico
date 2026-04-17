"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarX, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PickupDateTile,
  type PickupDate,
} from "@/components/pickup/PickupDateTile";
import { getOpenPickupDates } from "@/app/actions/pickup";
import { useCartStore } from "@/lib/stores/cart";

interface PickupSwitcherProps {
  /** Element that opens the dialog when clicked (e.g. a "Change" link). */
  children: React.ReactNode;
}

/**
 * Opens an inline dialog with all open pickup dates so the user can swap
 * their choice without leaving the cart page. Fetches dates lazily on first
 * open, caches them for subsequent opens.
 */
export function PickupSwitcher({ children }: PickupSwitcherProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";

  const [open, setOpen] = React.useState(false);
  const [dates, setDates] = React.useState<PickupDate[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const selectedId = useCartStore((s) => s.pickup_date_id);
  const setPickupDate = useCartStore((s) => s.setPickupDate);

  // Lazy-load on first open, cache afterwards
  React.useEffect(() => {
    if (!open || dates !== null) return;
    let active = true;
    setLoading(true);
    getOpenPickupDates()
      .then((r) => {
        if (!active) return;
        const rows = r.data ?? [];
        const mapped: PickupDate[] = rows.map((row) => ({
          id: row.id,
          date: row.pickup_date,
          pickup_start: row.pickup_window_start,
          pickup_end: row.pickup_window_end,
          cutoff_at: row.cutoff_at,
          is_open: row.is_open,
          lbs_remaining: Math.max(
            0,
            Number(row.capacity_lbs) - Number(row.reserved_lbs),
          ),
          capacity_lbs: Number(row.capacity_lbs),
        }));
        setDates(mapped);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, dates]);

  const handleSelect = (id: string) => {
    setPickupDate(id);
    const d = dates?.find((x) => x.id === id);
    if (d) {
      const label = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(new Date(`${d.date}T00:00:00`));
      toast.success(
        t("pickup.selectedToast", {
          defaultValue: "Pickup date selected for {{date}}",
          date: label,
        }),
      );
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("pickup.switchTitle", "Choose a pickup date")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "pickup.switchDesc",
              "Pick the Saturday that works best. Your cart stays intact.",
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-mole/60">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !dates || dates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-mole/70">
            <CalendarX className="h-8 w-8" />
            <p>
              {t(
                "pickup.noDatesShort",
                "No pickup dates open right now.",
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            {dates.map((d) => (
              <PickupDateTile
                key={d.id}
                pickupDate={d}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
