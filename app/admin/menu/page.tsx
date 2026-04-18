"use client";

import * as React from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  upsertMenuItem,
  deleteMenuItem,
  toggleInStock,
  upsertVariant,
  deleteVariant,
  reorderMenuItem,
  uploadMenuImage,
} from "@/app/actions/admin/menu";
import type {
  MenuCategory,
  MenuItemRow,
  MenuItemVariantRow,
  MenuUnit,
} from "@/types/database";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

const CATEGORIES: MenuCategory[] = [
  "carnitas",
  "chicharron",
  "drinks",
  "sides",
  "other",
];

export default function AdminMenuPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => getClient(), []);
  const [items, setItems] = React.useState<MenuItemRow[]>([]);
  const [variants, setVariants] = React.useState<
    Record<string, MenuItemVariantRow[]>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [pending, startTransition] = React.useTransition();

  const load = React.useCallback(async () => {
    setLoading(true);
    const [itemsRes, varsRes] = await Promise.all([
      supabase
        .from("menu_items")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_item_variants")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);
    setItems((itemsRes.data as MenuItemRow[]) ?? []);
    const map: Record<string, MenuItemVariantRow[]> = {};
    ((varsRes.data as MenuItemVariantRow[]) ?? []).forEach((v) => {
      (map[v.menu_item_id] ||= []).push(v);
    });
    setVariants(map);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof MenuItemRow>(
    id: string,
    key: K,
    value: MenuItemRow[K],
  ) => {
    const existing = items.find((i) => i.id === id);
    if (!existing) return;
    const merged = { ...existing, [key]: value } as MenuItemRow;
    startTransition(async () => {
      const res = await upsertMenuItem({
        id,
        slug: merged.slug,
        name_en: merged.name_en,
        name_es: merged.name_es,
        description_en: merged.description_en,
        description_es: merged.description_es,
        category: merged.category,
        unit: merged.unit,
        price: Number(merged.price),
        min_quantity: Number(merged.min_quantity),
        quantity_step: Number(merged.quantity_step),
        image_url: merged.image_url,
        in_stock: merged.in_stock,
        has_variants: merged.has_variants,
        sort_order: merged.sort_order,
      });
      if (res.success) void load();
      else toast.error(res.error ?? t("common.error"));
    });
  };

  const onReorder = (id: string, dir: "up" | "down") =>
    startTransition(async () => {
      const r = await reorderMenuItem(id, dir);
      if (r.success) void load();
      else toast.error(r.error ?? t("common.error"));
    });

  const onDelete = (id: string) => {
    if (!confirm(t("admin.menu.confirmDelete"))) return;
    startTransition(async () => {
      const r = await deleteMenuItem(id);
      if (r.success) void load();
      else toast.error(r.error ?? t("common.error"));
    });
  };

  const onStock = (id: string, v: boolean) =>
    startTransition(async () => {
      const r = await toggleInStock(id, v);
      if (r.success) void load();
      else toast.error(r.error ?? t("common.error"));
    });

  const onImageUpload = async (id: string, file: File) => {
    // Guard against oversized files before hitting the server action limit.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max is 10 MB — compress or resize it first.`,
      );
      return;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      const item = items.find((i) => i.id === id);
      if (item) form.append("slug", item.slug);
      const res = await uploadMenuImage(form);
      if (!res.success || !res.data) {
        toast.error(res.error ?? t("common.error"));
        return;
      }
      update(id, "image_url", res.data.url);
      toast.success(t("admin.menu.imageUploaded"));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Upload failed. File may be too large.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-mole">
          {t("admin.menu.title")}
        </h1>
        <AddItemDialog onCreated={() => void load()} />
      </div>

      {loading ? (
        <p className="text-mole/60">{t("common.loading")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="relative h-20 w-20 bg-papel rounded-md overflow-hidden shrink-0 border border-nopal/10">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name_en}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-mole/40">
                        {t("admin.menu.noImage")}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onImageUpload(item.id, f);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      title={t("admin.menu.uploadImage")}
                    />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">EN</Label>
                      <Input
                        defaultValue={item.name_en}
                        onBlur={(e) =>
                          e.target.value !== item.name_en &&
                          update(item.id, "name_en", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ES</Label>
                      <Input
                        defaultValue={item.name_es}
                        onBlur={(e) =>
                          e.target.value !== item.name_es &&
                          update(item.id, "name_es", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        {t("admin.menu.price")}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={item.price}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n) && n !== item.price)
                            update(item.id, "price", n);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("admin.menu.unit")}</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(v) =>
                          update(item.id, "unit", v as MenuUnit)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="each">each</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.in_stock}
                        onCheckedChange={(v) => onStock(item.id, v)}
                      />
                      <span className="text-xs text-mole/70">
                        {item.in_stock
                          ? t("admin.menu.inStock")
                          : t("admin.menu.outOfStock")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onReorder(item.id, "up")}
                        disabled={pending}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onReorder(item.id, "down")}
                        disabled={pending}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(item.id)}
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4 text-chile" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Variants */}
                <VariantsEditor
                  itemId={item.id}
                  variants={variants[item.id] ?? []}
                  reload={load}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantsEditor({
  itemId,
  variants,
  reload,
}: {
  itemId: string;
  variants: MenuItemVariantRow[];
  reload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [pending, startTransition] = React.useTransition();
  const [newSlug, setNewSlug] = React.useState("");
  const [newEn, setNewEn] = React.useState("");
  const [newEs, setNewEs] = React.useState("");
  const [newDelta, setNewDelta] = React.useState("0");

  const addVariant = () =>
    startTransition(async () => {
      if (!newSlug || !newEn) return;
      const res = await upsertVariant({
        menu_item_id: itemId,
        slug: newSlug,
        name_en: newEn,
        name_es: newEs || newEn,
        price_delta: Number(newDelta),
      });
      if (res.success) {
        setNewSlug("");
        setNewEn("");
        setNewEs("");
        setNewDelta("0");
        void reload();
      } else toast.error(res.error ?? t("common.error"));
    });

  const onDelete = (id: string) =>
    startTransition(async () => {
      const res = await deleteVariant(id);
      if (res.success) void reload();
      else toast.error(res.error ?? t("common.error"));
    });

  return (
    <div className="mt-2 rounded-md border border-nopal/10 bg-papel p-3">
      <p className="text-xs uppercase tracking-wide text-mole/60 mb-2">
        {t("admin.menu.variants")}
      </p>
      {variants.length > 0 ? (
        <ul className="space-y-1">
          {variants.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-2 text-sm rounded hover:bg-papel-warm/50 px-1 py-0.5"
            >
              <span className="font-mono text-xs w-24 truncate">{v.slug}</span>
              <span className="flex-1 truncate">
                {v.name_en} / {v.name_es}
              </span>
              <span className="text-xs text-mole/60 font-mono">
                {Number(v.price_delta) >= 0 ? "+" : ""}
                {Number(v.price_delta).toFixed(2)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(v.id)}
                disabled={pending}
              >
                <Trash2 className="h-3 w-3 text-chile" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2">
        <Input
          placeholder={t("admin.menu.variantSlug")}
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
        />
        <Input
          placeholder="EN"
          value={newEn}
          onChange={(e) => setNewEn(e.target.value)}
        />
        <Input
          placeholder="ES"
          value={newEs}
          onChange={(e) => setNewEs(e.target.value)}
        />
        <Input
          type="number"
          step="0.01"
          placeholder="Δ price"
          value={newDelta}
          onChange={(e) => setNewDelta(e.target.value)}
        />
        <Button onClick={addVariant} disabled={pending || !newSlug || !newEn}>
          <Plus className="h-4 w-4" />
          {t("admin.menu.addVariant")}
        </Button>
      </div>
    </div>
  );
}

function AddItemDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    slug: "",
    name_en: "",
    name_es: "",
    category: "other" as MenuCategory,
    unit: "each" as MenuUnit,
    price: "5.00",
  });

  const submit = () =>
    startTransition(async () => {
      const res = await upsertMenuItem({
        slug: form.slug,
        name_en: form.name_en,
        name_es: form.name_es || form.name_en,
        category: form.category,
        unit: form.unit,
        price: Number(form.price),
      });
      if (res.success) {
        setOpen(false);
        onCreated();
        toast.success(t("admin.menu.created"));
        setForm({
          slug: "",
          name_en: "",
          name_es: "",
          category: "other",
          unit: "each",
          price: "5.00",
        });
      } else toast.error(res.error ?? t("common.error"));
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t("admin.menu.addItem")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.menu.addItem")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder={t("admin.menu.slugPlaceholder")}
            value={form.slug}
            onChange={(e) =>
              setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="EN name"
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
            />
            <Input
              placeholder="ES name"
              value={form.name_es}
              onChange={(e) => setForm((f) => ({ ...f, name_es: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, category: v as MenuCategory }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.unit}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, unit: v as MenuUnit }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lb">lb</SelectItem>
                <SelectItem value="each">each</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !form.slug || !form.name_en}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
