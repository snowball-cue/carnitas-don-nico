"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingBag,
  CalendarDays,
  BookOpenCheck,
  Wallet,
  ListChecks,
  Wrench,
  ReceiptText,
  Bell,
  Users,
  UserRound,
  Send,
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

interface NavSection {
  titleKey: string | null;
  items: NavItem[];
}

function useNavSections(unreadCount: number): NavSection[] {
  return React.useMemo(
    () => [
      {
        titleKey: null,
        items: [
          { href: "/admin", labelKey: "admin.nav.home", icon: Home },
          { href: "/admin/orders", labelKey: "admin.nav.orders", icon: ShoppingBag },
          {
            href: "/admin/calendar",
            labelKey: "admin.nav.calendar",
            icon: CalendarDays,
          },
          {
            href: "/admin/menu",
            labelKey: "admin.nav.menu",
            icon: BookOpenCheck,
          },
          {
            href: "/admin/customers",
            labelKey: "admin.nav.customers",
            icon: Users,
          },
          {
            href: "/admin/expenses",
            labelKey: "admin.nav.expenses",
            icon: Wallet,
          },
        ],
      },
      {
        titleKey: "admin.nav.sectionMore",
        items: [
          {
            href: "/admin/catering",
            labelKey: "admin.nav.catering",
            icon: UtensilsCrossed,
          },
          {
            href: "/admin/receipts",
            labelKey: "admin.nav.receipts",
            icon: ReceiptText,
          },
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
            href: "/admin/broadcasts",
            labelKey: "admin.nav.broadcasts",
            icon: Send,
          },
          {
            href: "/admin/contacts",
            labelKey: "admin.nav.contacts",
            icon: UserRound,
          },
          {
            href: "/admin/groups",
            labelKey: "admin.nav.groups",
            icon: Users,
          },
          {
            href: "/admin/notifications",
            labelKey: "admin.nav.notifications",
            icon: Bell,
            badge: unreadCount,
          },
        ],
      },
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
        "group flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors",
        active
          ? "bg-oro/20 text-oro font-semibold ring-1 ring-oro/30"
          : "text-papel/85 hover:bg-papel/10 hover:text-papel",
      )}
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className="flex-1 truncate text-[17px]">{t(item.labelKey)}</span>
      {item.badge && item.badge > 0 ? (
        <Badge
          variant="oro"
          shape="pill"
          className="h-6 min-w-[1.5rem] justify-center px-2 text-xs"
        >
          {item.badge > 99 ? "99+" : item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

function NavGroups({
  pathname,
  sections,
  onNavigate,
}: {
  pathname: string;
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className={cn("flex flex-col gap-1", sIdx > 0 && "mt-4")}
        >
          {section.titleKey ? (
            <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-papel/45">
              {t(section.titleKey)}
            </p>
          ) : null}
          {section.items.map((item) => {
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
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user }: { user: AdminUserSummary }) {
  const { t } = useTranslation();
  const initial = (user.fullName ?? user.email ?? "?").charAt(0).toUpperCase();
  return (
    <div className="border-t border-papel/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-oro text-mole font-display text-lg font-semibold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-papel">
            {user.fullName ?? t("admin.shell.admin")}
          </p>
          <p className="truncate text-xs text-papel/60">{user.email}</p>
        </div>
        <Link
          href="/logout"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-papel/70 hover:bg-papel/10 hover:text-papel"
          title={t("admin.shell.backToSite")}
          aria-label={t("admin.shell.backToSite")}
        >
          <LogOut className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

export function AdminSidebar({ user, unreadCount }: AdminSidebarProps) {
  const pathname = usePathname() ?? "/admin";
  const { t } = useTranslation();
  const sections = useNavSections(unreadCount);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-72 flex-col bg-nopal text-papel shadow-cazo-2">
        <div className="flex items-center gap-3 px-5 py-6">
          <Logo size="md" />
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight">
              {t("common.appName")}
            </p>
            <p className="text-sm text-papel/70">{t("admin.shell.adminArea")}</p>
          </div>
        </div>
        <div className="h-px bg-papel/10 mx-3" />
        <div className="flex-1 overflow-y-auto py-4">
          <NavGroups pathname={pathname} sections={sections} />
        </div>
        <UserFooter user={user} />
      </aside>

      {/* Mobile top bar + sheet */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-nopal text-papel px-4 py-3 shadow-cazo-1">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-display text-lg">
            {t("admin.shell.adminArea")}
          </span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-papel/10"
            aria-label={t("admin.shell.openMenu")}
          >
            <MenuIcon className="h-6 w-6" />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-oro" />
            ) : null}
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 bg-nopal text-papel p-0 border-r-0"
          >
            <SheetHeader className="px-5 py-5">
              <SheetTitle className="text-papel flex items-center gap-3">
                <Logo size="md" />
                <span className="font-display text-xl">
                  {t("admin.shell.adminArea")}
                </span>
              </SheetTitle>
            </SheetHeader>
            <div className="h-px bg-papel/10 mx-3" />
            <div className="py-4">
              <NavGroups
                pathname={pathname}
                sections={sections}
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
