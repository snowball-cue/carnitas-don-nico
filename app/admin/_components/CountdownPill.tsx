"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function CountdownPill({ iso }: { iso: string }) {
  const { t } = useTranslation();
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const date = new Date(iso);
  const past = date.getTime() < Date.now();
  const distance = formatDistanceToNow(date, { addSuffix: true });
  return (
    <span
      key={tick}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        past ? "bg-chile/10 text-chile" : "bg-oro/20 text-mole"
      }`}
    >
      {past ? t("admin.dashboard.closedLabel") : distance}
    </span>
  );
}
