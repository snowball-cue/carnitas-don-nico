"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/app/actions/orders";
import { useCartStore, type CartLine } from "@/lib/stores/cart";
import type { MenuUnit } from "@/types/database";

interface RebookItem {
  menu_item_id: string;
  variant_id?: string;
  name_en: string;
  name_es: string;
  variant_name_en?: string;
  variant_name_es?: string;
  quantity: number;
  unit: MenuUnit;
  unit_price: number;
}

interface Props {
  orderId: string;
  canCancel: boolean;
  items: RebookItem[];
}

export function OrderDetailActions({ orderId, canCancel, items }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const clear = useCartStore((s) => s.clear);
  const add = useCartStore((s) => s.add);
  const [cancelling, setCancelling] = React.useState(false);

  const onCancel = async () => {
    if (!confirm(t("orders.cancelConfirm", "Cancel this order?"))) return;
    setCancelling(true);
    const r = await cancelOrder(orderId);
    setCancelling(false);
    if (r.success) {
      toast.success(t("orders.cancelled", "Order cancelled"));
      router.refresh();
    } else {
      toast.error(r.error ?? t("common.error", "Something went wrong"));
    }
  };

  const onRebook = () => {
    clear();
    for (const it of items) {
      const line: Omit<CartLine, "id" | "line_total"> = {
        menu_item_id: it.menu_item_id,
        menu_item_slug: "",
        variant_id: it.variant_id,
        name_en: it.name_en,
        name_es: it.name_es,
        variant_name_en: it.variant_name_en,
        variant_name_es: it.variant_name_es,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
      };
      add(line);
    }
    toast.success(t("orders.rebooked", "Added to cart — pick a new date"));
    router.push("/pickup");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={onRebook}>
        <RotateCcw className="h-4 w-4" />
        {t("orders.orderAgain", "Order again")}
      </Button>
      {canCancel && (
        <Button
          variant="destructive"
          onClick={onCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          {t("orders.cancel", "Cancel order")}
        </Button>
      )}
    </div>
  );
}
