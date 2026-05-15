"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function CountdownPill({ iso }: { iso: string }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return (
      <span className="inline-flex items-center rounded-full bg-oro/20 px-3 py-1 text-sm font-medium text-mole">
        &nbsp;
      </span>
    );
  }

  const date = new Date(iso);
  const past = date.getTime() < Date.now();
  const distance = formatDistanceToNow(date, { addSuffix: true });
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        past ? "bg-chile/10 text-chile" : "bg-oro/20 text-mole"
      }`}
    >
      {past ? t("admin.dashboard.closedLabel") : distance}
    </span>
  );
}
