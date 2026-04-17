"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  BookOpenCheck,
  Wallet,
  ListChecks,
  Wrench,
  ReceiptText,
  Bell,
  Users,
  UtensilsCrossed,
  Menu as MenuIcon,
  LogOut,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  fullName: string | null;
}

interface AdminSidebarProps {
  user: AdminUserSummary;
  unreadCount: number;
}

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function useNavItems(unreadCount: number): NavItem[] {
  return React.useMemo(
    () => [
      { href: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", labelKey: "admin.nav.orders", icon: ShoppingBag },
      {
        href: "/admin/catering",
        labelKey: "admin.nav.catering",
        icon: UtensilsCrossed,
      },
      {
        href: "/admin/calendar",
        labelKey: "admin.nav.calendar",
        icon: CalendarDays,
      },
      { href: "/admin/menu", labelKey: "admin.nav.menu", icon: BookOpenCheck },
      { href: "/admin/expenses", labelKey: "admin.nav.expenses", icon: Wallet },
      {
        href: "/admin/shopping-list",
        labelKey: "admin.nav.shoppingList",
        icon: ListChecks,
      },
      {
        href: "/admin/investments",
        labelKey: "admin.nav.investments",
        icon: Wrench,
      },
      {
        href: "/admin/receipts",
        labelKey: "admin.nav.receipts",
        icon: ReceiptText,
      },
      {
        href: "/admin/notifications",
        labelKey: "admin.nav.notifications",
        icon: Bell,
        badge: unreadCount,
      },
      { href: "/admin/customers", labelKey: "admin.nav.customers", icon: Users },
    ],
    [unreadCount],
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-papel/10 text-oro font-semibold"
          : "text-papel/80 hover:bg-papel/5 hover:text-papel",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {item.badge && item.badge > 0 ? (
        <Badge
          variant="oro"
          shape="pill"
          className="h-5 min-w-[1.25rem] justify-center px-1.5 text-[10px]"
        >
          {item.badge > 99 ? "99+" : item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

function NavList({
  pathname,
  items,
  onNavigate,
}: {
  pathname: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <NavLink
            key={item.href}
            item={item}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

function UserFooter({ user }: { user: AdminUserSummary }) {
  const { t } = useTranslation();
  const initial = (user.fullName ?? user.email ?? "?").charAt(0).toUpperCase();
  return (
    <div className="border-t border-papel/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-oro text-mole font-semibold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-papel">
            {user.fullName ?? t("admin.shell.admin")}
          </p>
          <p className="truncate text-xs text-papel/60">{user.email}</p>
        </div>
        <Link
          href="/"
          className="rounded-md p-2 text-papel/70 hover:bg-papel/10 hover:text-papel"
          title={t("admin.shell.backToSite")}
        >
          <LogOut className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function AdminSidebar({ user, unreadCount }: AdminSidebarProps) {
  const pathname = usePathname() ?? "/admin";
  const { t } = useTranslation();
  const items = useNavItems(unreadCount);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-nopal text-papel shadow-cazo-2">
        <div className="flex items-center gap-3 px-4 py-5">
          <Logo size="md" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight">
              {t("common.appName")}
            </p>
            <p className="text-xs text-papel/60">{t("admin.shell.adminArea")}</p>
          </div>
        </div>
        <div className="h-px bg-papel/10 mx-3" />
        <div className="flex-1 overflow-y-auto py-3">
          <NavList pathname={pathname} items={items} />
        </div>
        <UserFooter user={user} />
      </aside>

      {/* Mobile top bar + sheet */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-nopal text-papel px-4 py-3 shadow-cazo-1">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-display text-base">{t("admin.shell.title")}</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-papel/10"
            aria-label={t("admin.shell.openMenu")}
          >
            <MenuIcon className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-oro" />
            ) : null}
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 bg-nopal text-papel p-0 border-r-0"
          >
            <SheetHeader className="px-4 py-5">
              <SheetTitle className="text-papel flex items-center gap-3">
                <Logo size="md" />
                <span>{t("admin.shell.title")}</span>
              </SheetTitle>
            </SheetHeader>
            <div className="h-px bg-papel/10 mx-3" />
            <div className="py-3">
              <NavList
                pathname={pathname}
                items={items}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
            <UserFooter user={user} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
