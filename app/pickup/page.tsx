import { PapelPicadoTop } from "@/components/brand/PapelPicado";
import { getOpenPickupDates } from "@/app/actions/pickup";
import { PickupPicker } from "./PickupPicker";
import type { PickupDate } from "@/components/pickup/PickupDateTile";

export const revalidate = 30;

export default async function PickupPage() {
  const res = await getOpenPickupDates();
  const rows = res.data ?? [];

  const dates: PickupDate[] = rows.map((r) => ({
    id: r.id,
    date: r.pickup_date,
    pickup_start: r.pickup_window_start,
    pickup_end: r.pickup_window_end,
    cutoff_at: r.cutoff_at,
    is_open: r.is_open,
    lbs_remaining: Math.max(0, Number(r.capacity_lbs) - Number(r.reserved_lbs)),
    capacity_lbs: Number(r.capacity_lbs),
  }));

  return (
    <div className="bg-papel min-h-screen">
      <section className="w-full bg-nopal text-papel">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold">
            Fechas de Pickup
            <span className="block text-oro text-2xl md:text-3xl mt-1">
              Pickup Dates
            </span>
          </h1>
          <p className="mt-3 text-papel/80 max-w-2xl mx-auto">
            Elige el sábado que mejor te quede · Pick the Saturday that works
            best.
          </p>
        </div>
      </section>

      <PapelPicadoTop height={36} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <PickupPicker dates={dates} />
      </div>
    </div>
  );
}
