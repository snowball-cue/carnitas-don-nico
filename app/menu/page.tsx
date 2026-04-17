import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PapelPicadoTop } from "@/components/brand/PapelPicado";
import { MenuCard, type MenuItem } from "@/components/menu/MenuCard";
import type { Variant } from "@/components/menu/VariantPicker";
import type {
  MenuCategory,
  MenuItemRow,
  MenuItemVariantRow,
} from "@/types/database";
import { MenuPickupBanner } from "./MenuPickupBanner";

export const revalidate = 60;

const CATEGORY_ORDER: MenuCategory[] = [
  "carnitas",
  "chicharron",
  "drinks",
  "sides",
  "other",
];

const CATEGORY_LABELS: Record<MenuCategory, { en: string; es: string }> = {
  carnitas: { en: "Carnitas", es: "Carnitas" },
  chicharron: { en: "Chicharrón", es: "Chicharrón" },
  drinks: { en: "Drinks", es: "Bebidas" },
  sides: { en: "Sides", es: "Acompañamientos" },
  other: { en: "Other", es: "Otros" },
};

export default async function MenuPage() {
  const supabase = await createServerSupabaseClient();

  const [itemsRes, variantsRes] = await Promise.all([
    supabase
      .from("menu_items")
      .select("*")
      .eq("in_stock", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_item_variants")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  const items = (itemsRes.data as MenuItemRow[]) ?? [];
  const variants = (variantsRes.data as MenuItemVariantRow[]) ?? [];

  const byItem = new Map<string, MenuItemVariantRow[]>();
  variants.forEach((v) => {
    const arr = byItem.get(v.menu_item_id) ?? [];
    arr.push(v);
    byItem.set(v.menu_item_id, arr);
  });

  // Group by category in CATEGORY_ORDER
  const grouped = new Map<MenuCategory, MenuItem[]>();
  for (const row of items) {
    const vs: Variant[] = (byItem.get(row.id) ?? []).map((v) => ({
      id: v.id,
      slug: v.slug,
      name_en: v.name_en,
      name_es: v.name_es,
      price_modifier: v.price_delta,
      in_stock: v.in_stock,
    }));
    const item: MenuItem = {
      id: row.id,
      slug: row.slug,
      name_en: row.name_en,
      name_es: row.name_es,
      description_en: row.description_en ?? undefined,
      description_es: row.description_es ?? undefined,
      image_url: row.image_url,
      unit: row.unit,
      base_price: Number(row.price),
      min_quantity: Number(row.min_quantity),
      quantity_step: Number(row.quantity_step),
      has_variants: row.has_variants,
      variants: vs,
      in_stock: row.in_stock,
    };
    const arr = grouped.get(row.category) ?? [];
    arr.push(item);
    grouped.set(row.category, arr);
  }

  return (
    <div className="bg-papel">
      {/* Hero band */}
      <section className="w-full bg-nopal text-papel">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
            Nuestro Menú
            <span className="block text-oro text-2xl md:text-3xl mt-1">
              Our Menu
            </span>
          </h1>
          <p className="mt-3 text-papel/80 max-w-2xl mx-auto">
            Cerdo cocido a fuego lento · Slow-cooked pork, mixed cuts, and
            agua-frescas made fresh for pickup.
          </p>
        </div>
      </section>

      <PapelPicadoTop height={36} />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <MenuPickupBanner />
      </div>

      {/* Category sections */}
      <div className="mx-auto max-w-6xl px-4 pb-16 space-y-12">
        {CATEGORY_ORDER.map((cat) => {
          const list = grouped.get(cat);
          if (!list || list.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <div className="mb-5 flex items-end justify-between">
                <h2
                  id={`cat-${cat}`}
                  className="font-display text-2xl md:text-3xl font-bold text-mole"
                >
                  {CATEGORY_LABELS[cat].es}
                  <span className="block text-sm md:text-base font-normal text-mole/60">
                    {CATEGORY_LABELS[cat].en}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {list.map((it) => (
                  <MenuCard key={it.id} item={it} />
                ))}
              </div>
            </section>
          );
        })}

        {items.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-nopal/30 bg-papel-warm/40 p-10 text-center">
            <p className="font-display text-xl text-mole">
              No hay artículos disponibles por ahora.
            </p>
            <p className="mt-2 text-sm text-mole/70">
              No items available right now. Check back soon.
            </p>
            <Link
              href="/pickup"
              className="mt-4 inline-block text-nopal underline"
            >
              See pickup dates
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
