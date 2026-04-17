"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export function T({
  k,
  values,
  as: Tag = "span",
  className,
}: {
  k: string;
  values?: Record<string, string | number>;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}) {
  const { t } = useTranslation();
  const Component = Tag as React.ElementType;
  return <Component className={className}>{t(k, values)}</Component>;
}
