"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, formatLbs } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VariantPicker, type Variant } from "./VariantPicker";
import { useCartStore } from "@/lib/stores/cart";

export interface MenuItem {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  description_en?: string;
  description_es?: string;
  image_url?: string | null;
  unit: "lb" | "each";
  base_price: number;
  min_quantity: number;
  quantity_step: number;
  has_variants: boolean;
  variants?: Variant[];
  in_stock: boolean;
}

interface MenuCardProps {
  item: MenuItem;
  className?: string;
}

export function MenuCard({ item, className }: MenuCardProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";
  const add = useCartStore((s) => s.add);

  const [variantId, setVariantId] = React.useState<string | undefined>(
    item.variants?.[0]?.id
  );
  const [qty, setQty] = React.useState<number>(item.min_quantity);

  const selectedVariant = item.variants?.find((v) => v.id === variantId);
  const unitPrice = item.base_price + (selectedVariant?.price_modifier ?? 0);
  const name = isEs ? item.name_es : item.name_en;
  const description = isEs ? item.description_es : item.description_en;
  const outOfStock =
    !item.in_stock || (item.has_variants && selectedVariant?.in_stock === false);

  const step = item.quantity_step;
  const min = item.min_quantity;

  const dec = () => setQty((q) => Math.max(min, +(q - step).toFixed(2)));
  const inc = () => setQty((q) => +(q + step).toFixed(2));

  const priceLabel =
    item.unit === "lb"
      ? `${formatCurrency(unitPrice, locale)}/${t("menu.lb", "lb")}`
      : formatCurrency(unitPrice, locale);

  const qtyLabel = item.unit === "lb" ? formatLbs(qty, locale) : `${qty}`;

  const onAdd = () => {
    if (outOfStock) return;
    add({
      menu_item_id: item.id,
      menu_item_slug: item.slug,
      variant_id: selectedVariant?.id,
      variant_slug: selectedVariant?.slug,
      name_en: item.name_en,
      name_es: item.name_es,
      variant_name_en: selectedVariant?.name_en,
      variant_name_es: selectedVariant?.name_es,
      quantity: qty,
      unit: item.unit,
      unit_price: unitPrice,
    });
    toast.success(
      t("menu.addedToCart", {
        defaultValue: "Added {{qty}} of {{name}} to cart",
        qty: qtyLabel,
        name: name,
      })
    );
  };

  return (
    <Card
      variant="loteria"
      className={cn(
        "flex flex-col overflow-hidden",
        outOfStock && "opacity-60",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-papel">
        <Image
          src={item.image_url || "/brand/placeholder-menu.svg"}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <Badge
          variant="oro"
          shape="pill"
          className="absolute right-3 top-3 text-sm shadow"
        >
          {priceLabel}
        </Badge>
        {outOfStock && (
          <Badge
            variant="sale"
            shape="pill"
            className="absolute left-3 top-3"
          >
            {t("menu.outOfStock", "Out of Stock")}
          </Badge>
        )}
      </div>

      <CardContent className="flex-1 space-y-3 p-4">
        <div>
          <h3 className="font-display text-xl font-semibold leading-tight text-mole">
            {name}
          </h3>
          <p className="text-xs text-mole/60">{isEs ? item.name_en : item.name_es}</p>
        </div>
        {description && (
          <p className="text-sm text-mole/80">{description}</p>
        )}
        {item.has_variants && item.variants && item.variants.length > 0 && (
          <VariantPicker
            variants={item.variants}
            value={variantId}
            onChange={setVariantId}
          />
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 p-4 pt-0">
        <div
          role="group"
          aria-label={t("menu.quantity", "Quantity")}
          className="inline-flex items-center rounded-full border border-nopal/30 bg-papel"
        >
          <button
            type="button"
            onClick={dec}
            disabled={qty <= min}
            aria-label={t("menu.decrease", "Decrease")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-l-full text-mole hover:bg-papel-warm disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[56px] px-2 text-center text-sm font-semibold tabular-nums">
            {qtyLabel}
          </span>
          <button
            type="button"
            onClick={inc}
            aria-label={t("menu.increase", "Increase")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-r-full text-mole hover:bg-papel-warm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          variant="oro"
          size="default"
          onClick={onAdd}
          disabled={outOfStock}
        >
          {t("menu.addToCart", "Add to Cart")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default MenuCard;
