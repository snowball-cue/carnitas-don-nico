import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  cta?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-nopal/20 bg-papel-warm/40 px-6 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-papel text-4xl text-nopal"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-mole">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-mole/70">{description}</p>
      )}
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}

export default EmptyState;
