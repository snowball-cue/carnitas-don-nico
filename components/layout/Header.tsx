"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Menu as MenuIcon, ShoppingBag, User as UserIcon, LogOut, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/Logo";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useUser } from "@/lib/hooks/useUser";
import { useCartStore } from "@/lib/stores/cart";

export function Header() {
  const pathname = usePathname() || "/";
  const { t } = useTranslation();
  const { user, profile, isAdmin, signOut } = useUser();
  const itemCount = useCartStore((s) => s.lines.length);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Admin routes have their own sidebar/topbar — don't double-stack headers.
  if (pathname.startsWith("/admin")) return null;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/menu", label: t("nav.menu"), show: true },
    { href: "/pickup", label: t("nav.pickup"), show: true },
    { href: "/catering", label: t("nav.catering", "Catering"), show: true },
    { href: "/orders", label: t("nav.orders"), show: !!user },
    { href: "/admin", label: t("nav.admin"), show: isAdmin },
  ];

  const displayName =
    profile?.display_name ||
    user?.email?.split("@")[0] ||
    t("common.guest");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full text-papel transition-colors",
        scrolled ? "bg-nopal/95 backdrop-blur shadow-sm" : "bg-nopal"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Left: logo + wordmark + desktop nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-display hidden text-lg font-bold tracking-[0.18em] md:inline">
              CARNITAS DON NICO
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav
              .filter((n) => n.show)
              .map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-papel/90 transition-colors hover:bg-nopal-dark hover:text-papel"
                >
                  {n.label}
                </Link>
              ))}
          </nav>
        </div>

        {/* Right: language + cart + auth */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Language toggle — always visible on both mobile and desktop */}
          <LanguageToggle size="sm" />

          <Link
            href="/cart"
            aria-label={t("nav.cart")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-papel hover:bg-nopal-dark"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge
                variant="oro"
                shape="pill"
                className="absolute -right-1 -top-1 h-5 min-w-[20px] justify-center px-1 text-[10px]"
              >
                {itemCount}
              </Badge>
            )}
          </Link>

          {/* Desktop auth */}
          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full hover:opacity-80"
                    aria-label={t("nav.account")}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-oro text-mole text-xs font-semibold">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <UserIcon className="mr-2 h-4 w-4" />
                      {t("nav.account")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      {t("nav.orders")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="oro" size="sm">
                <Link href="/login">{t("nav.signIn")}</Link>
              </Button>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-papel hover:bg-nopal-dark md:hidden"
                aria-label={t("nav.menu")}
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col gap-4">
              <SheetHeader>
                <SheetTitle>{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {nav
                  .filter((n) => n.show)
                  .map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium text-mole hover:bg-papel-warm"
                    >
                      {n.label}
                    </Link>
                  ))}
              </nav>
              <div className="mt-auto space-y-3 border-t border-nopal/10 pt-4">
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      void signOut();
                      setMobileOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.signOut")}
                  </Button>
                ) : (
                  <Button asChild variant="oro" className="w-full">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      {t("nav.signIn")}
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default Header;
