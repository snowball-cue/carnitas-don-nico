"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function DashboardGreeting({ name }: { name: string | null }) {
  const { t } = useTranslation();
  const display = name && name.trim().length > 0 ? name : "Don Nico";
  const [hour, setHour] = React.useState<number | null>(null);
  React.useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  let key = "admin.dashboard.greetingGeneric";
  if (hour !== null) {
    if (hour >= 5 && hour < 12) key = "admin.dashboard.greetingMorning";
    else if (hour >= 12 && hour < 17) key = "admin.dashboard.greetingAfternoon";
    else key = "admin.dashboard.greetingEvening";
  }

  return (
    <h1 className="font-display text-4xl md:text-5xl text-mole">
      {t(key, { name: display })}
    </h1>
  );
}
