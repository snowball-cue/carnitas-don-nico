"use client";

import Link from "next/link";
import {
  CalendarPlus,
  PlusCircle,
  ShoppingBag,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface Tile {
  href: string;
  labelKey: string;
  hintKey: string;
  icon: LucideIcon;
  tone: "oro" | "agave" | "chile" | "nopal";
}

const TILES: Tile[] = [
  {
    href: "/admin/orders",
    labelKey: "admin.dashboard.actionSeeOrders",
    hintKey: "admin.dashboard.actionSeeOrdersHint",
    icon: ShoppingBag,
    tone: "oro",
  },
  {
    href: "/admin/expenses",
    labelKey: "admin.dashboard.actionAddExpense",
    hintKey: "admin.dashboard.actionAddExpenseHint",
    icon: PlusCircle,
    tone: "agave",
  },
  {
    href: "/admin/calendar",
    labelKey: "admin.dashboard.actionNewPickup",
    hintKey: "admin.dashboard.actionNewPickupHint",
    icon: CalendarPlus,
    tone: "nopal",
  },
  {
    href: "/admin/broadcasts/new",
    labelKey: "admin.dashboard.actionMessage",
    hintKey: "admin.dashboard.actionMessageHint",
    icon: Megaphone,
    tone: "chile",
  },
];

const TONE_STYLES: Record<Tile["tone"], string> = {
  oro: "bg-oro text-mole hover:bg-oro/90 border-oro/30",
  agave: "bg-agave text-papel hover:bg-agave/90 border-agave/30",
  nopal: "bg-nopal text-papel hover:bg-nopal/90 border-nopal/30",
  chile: "bg-chile text-papel hover:bg-chile/90 border-chile/30",
};

export function QuickActions() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.href}
            href={tile.href}
            className={cn(
              "group flex min-h-[140px] flex-col justify-between rounded-2xl border-2 px-5 py-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-mole/30",
              TONE_STYLES[tile.tone],
            )}
          >
            <Icon className="h-9 w-9" strokeWidth={2.25} />
            <div>
              <p className="font-display text-xl leading-tight">
                {t(tile.labelKey)}
              </p>
              <p className="mt-1 text-sm opacity-90">{t(tile.hintKey)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
