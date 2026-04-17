"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/brand/Logo";
import { LanguageToggle } from "@/components/common/LanguageToggle";

export function Footer() {
  const pathname = usePathname() || "/";
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  // Don't show the public footer inside admin — it has its own UserFooter.
  if (pathname.startsWith("/admin")) return null;

  const links = [
    { href: "/menu", label: t("nav.menu") },
    { href: "/pickup", label: t("nav.pickup") },
    { href: "/orders", label: t("nav.orders") },
  ];

  return (
    <footer className="bg-nopal-dark text-papel/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div className="flex items-center gap-3">
          <Logo size="md" mark />
          <div>
            <div className="font-display text-base font-bold tracking-widest text-papel">
              CARNITAS DON NICO
            </div>
            <p className="text-xs">{t("footer.tagline", "Auténticas carnitas al estilo Michoacán")}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm md:justify-center">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-papel">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-start md:justify-end">
          <LanguageToggle size="sm" />
        </div>
      </div>

      <div className="border-t border-papel/10">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs md:px-6">
          {t("footer.copyright", "© {{year}} Carnitas Don Nico — Hecho con ♥ en Texas.", {
            year,
          })}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
