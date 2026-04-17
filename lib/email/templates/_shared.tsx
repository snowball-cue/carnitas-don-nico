import * as React from "react";

export type Locale = "en" | "es";

export const brand = {
  nopal: "#3A4A2F",
  oro: "#C8A04A",
  papel: "#F5EFE0",
  mole: "#1F2818",
  paperDark: "#EFE6D2",
  textMuted: "#5a5140",
} as const;

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://carnitas-don-nico.vercel.app"
  );
}

export function formatCurrency(n: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function formatPickupDate(iso: string, locale: Locale): string {
  // iso is YYYY-MM-DD — parse as local date, avoid UTC drift
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return iso;
  }
}

export function formatTime(hhmmss: string | null, locale: Locale): string {
  if (!hhmmss) return "";
  const [h, m] = hhmmss.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return hhmmss.slice(0, 5);
  }
}
