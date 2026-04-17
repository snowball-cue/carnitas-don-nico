"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import type {
  MenuCategory,
  MenuUnit,
  MenuItemInsert,
  MenuItemVariantInsert,
} from "@/types/database";
import type { ActionResult } from "./orders";

export interface UpsertMenuItemInput {
  id?: string;
  slug: string;
  name_en: string;
  name_es: string;
  description_en?: string | null;
  description_es?: string | null;
  category: MenuCategory;
  unit: MenuUnit;
  price: number;
  min_quantity?: number;
  quantity_step?: number;
  image_url?: string | null;
  in_stock?: boolean;
  has_variants?: boolean;
  sort_order?: number;
}

export async function upsertMenuItem(
  input: UpsertMenuItemInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const row: MenuItemInsert = {
      slug: input.slug,
      name_en: input.name_en,
      name_es: input.name_es,
      description_en: input.description_en ?? null,
      description_es: input.description_es ?? null,
      category: input.category,
      unit: input.unit,
      price: input.price,
      min_quantity: input.min_quantity ?? 1,
      quantity_step: input.quantity_step ?? 1,
      image_url: input.image_url ?? null,
      in_stock: input.in_stock ?? true,
      has_variants: input.has_variants ?? false,
      sort_order: input.sort_order ?? 0,
    };

    if (input.id) {
      const { error } = await svc.from("menu_items").update(row).eq("id", input.id);
      if (error) throw error;
      revalidatePath("/admin/menu");
      revalidatePath("/menu");
      return { success: true, data: { id: input.id } };
    }

    const { data, error } = await svc
      .from("menu_items")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      const pgCode = (error as { code?: string }).code;
      if (pgCode === "23505") {
        return {
          success: false,
          error: `Slug "${input.slug}" is already used by another menu item. Pick a different slug.`,
        };
      }
      throw error;
    }
    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save menu item",
    };
  }
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc.from("menu_items").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete menu item",
    };
  }
}

export async function toggleInStock(
  id: string,
  inStock: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("menu_items")
      .update({ in_stock: inStock })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to toggle stock",
    };
  }
}

export async function reorderMenuItem(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const delta = direction === "up" ? -10 : 10;
    const { data: item, error: readErr } = await svc
      .from("menu_items")
      .select("sort_order")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!item) return { success: false, error: "Item not found" };
    const { error } = await svc
      .from("menu_items")
      .update({ sort_order: (item.sort_order ?? 0) + delta })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reorder",
    };
  }
}

export interface UpsertVariantInput {
  id?: string;
  menu_item_id: string;
  slug: string;
  name_en: string;
  name_es: string;
  description_en?: string | null;
  description_es?: string | null;
  price_delta?: number;
  in_stock?: boolean;
  sort_order?: number;
}

export async function upsertVariant(
  input: UpsertVariantInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const row: MenuItemVariantInsert = {
      menu_item_id: input.menu_item_id,
      slug: input.slug,
      name_en: input.name_en,
      name_es: input.name_es,
      description_en: input.description_en ?? null,
      description_es: input.description_es ?? null,
      price_delta: input.price_delta ?? 0,
      in_stock: input.in_stock ?? true,
      sort_order: input.sort_order ?? 0,
    };
    if (input.id) {
      const { error } = await svc
        .from("menu_item_variants")
        .update(row)
        .eq("id", input.id);
      if (error) throw error;
      revalidatePath("/admin/menu");
      revalidatePath("/menu");
      return { success: true, data: { id: input.id } };
    }
    const { data, error } = await svc
      .from("menu_item_variants")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save variant",
    };
  }
}

export async function deleteVariant(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const svc = createServiceRoleClient();
    const { error } = await svc
      .from("menu_item_variants")
      .delete()
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete variant",
    };
  }
}

/**
 * Uploads a menu image to the `menu-images` Storage bucket.
 * Expects FormData with `file: File` and optional `slug: string`.
 * Returns the public URL on success.
 */
export async function uploadMenuImage(
  form: FormData,
): Promise<ActionResult<{ url: string; path: string }>> {
  try {
    await requireAdmin();
    const file = form.get("file") as File | null;
    const slug = (form.get("slug") as string | null) ?? "menu";
    if (!file || !(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }
    const svc = createServiceRoleClient();
    const ext = file.name.split(".").pop() || "jpg";
    const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const path = `${safeSlug}/${Date.now()}.${ext}`;

    const arrayBuf = await file.arrayBuffer();
    const { error } = await svc.storage
      .from("menu-images")
      .upload(path, new Uint8Array(arrayBuf), {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
    if (error) throw error;

    const { data: pub } = svc.storage.from("menu-images").getPublicUrl(path);
    return { success: true, data: { url: pub.publicUrl, path } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to upload image",
    };
  }
}
