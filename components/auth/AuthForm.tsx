"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tasteful form shell for sign-in / sign-up pages. Keeps consistent spacing,
 * papel surface, and max-width across all auth pages.
 */
export function AuthForm({
  className,
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      noValidate
      {...props}
    >
      {children}
    </form>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-theme(spacing.32))] w-full px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-xl border border-papel-warm/80 bg-papel-warm p-6 shadow-cazo-1 sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="font-display text-3xl tracking-tight text-mole">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-mole/70">{subtitle}</p>
          ) : null}
        </div>
        {children}
        {footer ? (
          <div className="mt-6 border-t border-papel/60 pt-6 text-center text-sm text-mole/70">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AuthForm;
