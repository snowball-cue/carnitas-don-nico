"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export function DashboardGreeting({ name }: { name: string | null }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  let key = "admin.dashboard.greetingMorning";
  if (hour >= 12 && hour < 17) key = "admin.dashboard.greetingAfternoon";
  else if (hour >= 17 || hour < 5) key = "admin.dashboard.greetingEvening";
  const display = name && name.trim().length > 0 ? name : "Don Nico";
  return (
    <h1 className="font-display text-3xl md:text-4xl text-mole">
      {t(key, { name: display })}
    </h1>
  );
}
