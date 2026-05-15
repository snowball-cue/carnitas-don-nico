"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/config";

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider defaultTheme="light">
      <I18nProvider initialLocale={initialLocale}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
