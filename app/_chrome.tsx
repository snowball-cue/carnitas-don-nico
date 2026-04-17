"use client";

import dynamic from "next/dynamic";

export const HeaderClient = dynamic(
  () => import("@/components/layout/Header").then((m) => m.Header),
  { ssr: false },
);

export const FooterClient = dynamic(
  () => import("@/components/layout/Footer").then((m) => m.Footer),
  { ssr: false },
);

export const MobileNavClient = dynamic(
  () => import("@/components/layout/MobileNav").then((m) => m.MobileNav),
  { ssr: false },
);
