"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { cn, formatCurrency, formatLbs } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore, type CartLine } from "@/lib/stores/cart";
import { EmptyState } from "@/components/empty/EmptyState";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "right" | "bottom";
}

export function CartSheet({ open, onOpenChange, side = "bottom" }: CartSheetProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage || "es").startsWith("es");
  const locale = isEs ? "es-MX" : "en-US";
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const pickupDateId = useCartStore((s) => s.pickup_date_id);
  const remove = useCartStore((s) => s.remove);
  const update = useCartStore((s) => s.updateQuantity);

  const nameFor = (l: CartLine) => (isEs ? l.name_es : l.name_en);
  const variantFor = (l: CartLine) =>
    isEs ? l.variant_name_es : l.variant_name_en;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "flex flex-col gap-0 bg-papel p-0",
          side === "bottom" ? "max-h-[90vh] rounded-t-2xl" : "w-full sm:max-w-md"
        )}
      >
        <SheetHeader className="border-b border-nopal/10 px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-nopal" />
            {t("cart.title", "Your Cart")}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex-1 px-5 py-8">
            <EmptyState
              icon={<span className="text-5xl">🌮</span>}
              title={
                isEs ? "Tu carrito está vacío" : "Your cart is empty"
              }
              description={t(
                "cart.emptyDesc",
                "Agrega algo delicioso del menú."
              )}
              cta={
                <SheetClose asChild>
                  <Button asChild variant="oro">
                    <Link href="/menu">{t("cart.browseMenu", "Browse Menu")}</Link>
                  </Button>
                </SheetClose>
              }
            />
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-nopal/10 overflow-y-auto px-5 py-2">
              {lines.map((l) => (
                <li key={l.id} className="flex gap-3 py-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-papel-warm">
                    <Image
                      src="/brand/placeholder-menu.svg"
                      alt={nameFor(l)}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-mole">
                          {nameFor(l)}
                        </div>
                        {variantFor(l) && (
                          <div className="text-xs text-mole/60">{variantFor(l)}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(l.id)}
                        aria-label={t("cart.remove", "Remove")}
                        className="rounded p-1 text-mole/50 hover:bg-papel-warm hover:text-chile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-full border border-nopal/30">
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              l.id,
                              +(l.quantity - (l.unit === "lb" ? 0.5 : 1)).toFixed(2)
                            )
                          }
                          className="inline-flex h-8 w-8 items-center justify-center"
                          aria-label={t("menu.decrease", "Decrease")}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[52px] px-1 text-center text-sm tabular-nums">
                          {l.unit === "lb"
                            ? formatLbs(l.quantity, locale)
                            : l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              l.id,
                              +(l.quantity + (l.unit === "lb" ? 0.5 : 1)).toFixed(2)
                            )
                          }
                          className="inline-flex h-8 w-8 items-center justify-center"
                          aria-label={t("menu.increase", "Increase")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-sm font-semibold text-mole tabular-nums">
                        {formatCurrency(l.line_total, locale)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-nopal/10 bg-papel-warm/40 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-mole/70">
                  {t("cart.pickupDate", "Pickup date")}
                </span>
                <span className="font-medium text-mole">
                  {pickupDateId
                    ? t("cart.selected", "Selected")
                    : t("cart.notSelected", "Not selected")}
                </span>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-base">
                <span className="font-medium text-mole">{t("cart.subtotal", "Subtotal")}</span>
                <span className="font-bold text-mole tabular-nums">
                  {formatCurrency(subtotal, locale)}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild variant="oro" size="lg" className="w-full">
                  <Link href="/checkout">{t("cart.checkout", "Checkout")}</Link>
                </Button>
                <SheetClose asChild>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/menu">
                      {t("cart.continueShopping", "Continue Shopping")}
                    </Link>
                  </Button>
                </SheetClose>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default CartSheet;
