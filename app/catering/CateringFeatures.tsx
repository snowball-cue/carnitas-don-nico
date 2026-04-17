"use client";

import { Scale, CalendarCheck, Utensils, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Feature {
  icon: LucideIcon;
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
}

const FEATURES: Feature[] = [
  {
    icon: Scale,
    titleKey: "catering.features.minTitle",
    titleFallback: "10+ lb minimum",
    bodyKey: "catering.features.minBody",
    bodyFallback:
      "Catering starts at 10 lbs — enough to feed about 20 hungry guests.",
  },
  {
    icon: CalendarCheck,
    titleKey: "catering.features.leadTitle",
    titleFallback: "Plan 1 week ahead",
    bodyKey: "catering.features.leadBody",
    bodyFallback:
      "We cook to order. Give us a week so everything shows up fresh and on time.",
  },
  {
    icon: Utensils,
    titleKey: "catering.features.packageTitle",
    titleFallback: "Sides optional, packaging included",
    bodyKey: "catering.features.packageBody",
    bodyFallback:
      "Add tortillas, salsas, and pico — or just the carnitas. Bilingual packaging always.",
  },
];

export function CateringFeatures() {
  const { t } = useTranslation();
  return (
    <section className="bg-papel py-12 md:py-16">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, titleKey, titleFallback, bodyKey, bodyFallback }) => (
          <div
            key={titleKey}
            className="rounded-2xl bg-papel-warm border border-oro/40 p-6 shadow-cazo-1 flex flex-col gap-3"
          >
            <div className="h-12 w-12 rounded-full bg-nopal text-oro flex items-center justify-center">
              <Icon size={24} strokeWidth={2} />
            </div>
            <h3 className="font-display text-xl font-semibold text-mole">
              {t(titleKey, titleFallback)}
            </h3>
            <p className="text-mole/70 text-sm leading-relaxed">
              {t(bodyKey, bodyFallback)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
