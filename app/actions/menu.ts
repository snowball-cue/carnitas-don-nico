"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MenuItemRow, MenuItemVariantRow } from "@/types/database";

export interface MenuItemWithVariants extends MenuItemRow {
  variants: MenuItemVariantRow[];
}

export async function getMenuItems(): Promise<{
  success: boolean;
  data?: MenuItemWithVariants[];
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: items, error: itemsErr } = await supabase
      .from("menu_items")
      .select("*")
      .eq("in_stock", true)
      .order("sort_order", { ascending: true });

    if (itemsErr) throw itemsErr;
    if (!items) return { success: true, data: [] };

    const { data: variants, error: variantsErr } = await supabase
      .from("menu_item_variants")
      .select("*")
      .order("sort_order", { ascending: true });
    if (variantsErr) throw variantsErr;

    const byItem = new Map<string, MenuItemVariantRow[]>();
    (variants ?? []).forEach((v) => {
      const arr = byItem.get(v.menu_item_id) ?? [];
      arr.push(v);
      byItem.set(v.menu_item_id, arr);
    });

    const data: MenuItemWithVariants[] = items.map((it) => ({
      ...(it as MenuItemRow),
      variants: byItem.get(it.id) ?? [],
    }));

    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to fetch menu",
    };
  }
}
