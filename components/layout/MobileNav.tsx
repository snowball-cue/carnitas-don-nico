"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Home,
  UtensilsCrossed,
  ShoppingBag,
  ClipboardList,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/stores/cart";

interface TabDef {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  match: (p: string) => boolean;
}

const TABS: TabDef[] = [
  { href: "/", icon: Home, labelKey: "nav.home", match: (p) => p === "/" },
  {
    href: "/menu",
    icon: UtensilsCrossed,
    labelKey: "nav.menu",
    match: (p) => p.startsWith("/menu"),
  },
  {
    href: "/cart",
    icon: ShoppingBag,
    labelKey: "nav.cart",
    match: (p) => p.startsWith("/cart") || p.startsWith("/checkout"),
  },
  {
    href: "/orders",
    icon: ClipboardList,
    labelKey: "nav.orders",
    match: (p) => p.startsWith("/orders"),
  },
  {
    href: "/account",
    icon: UserIcon,
    labelKey: "nav.profile",
    match: (p) => p.startsWith("/account"),
  },
];

export function MobileNav() {
  const pathname = usePathname() || "/";
  const { t } = useTranslation();
  const itemCount = useCartStore((s) => s.lines.length);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-nopal/10 bg-papel md:hidden",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label={t("nav.primary", "Primary")}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const isCart = tab.href === "/cart";
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-nopal/5 text-oro"
                    : "text-mole/70 hover:text-mole"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center",
                    active && "rounded-full bg-nopal text-oro"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isCart && itemCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-oro px-1 text-[9px] font-bold text-mole">
                      {itemCount}
                    </span>
                  )}
                </span>
                <span>{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileNav;
