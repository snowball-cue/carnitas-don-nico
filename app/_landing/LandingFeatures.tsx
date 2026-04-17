"use client";

import { ChefHat, Scale, UserCheck, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface Feature {
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
}

const FEATURES: Feature[] = [
  {
    icon: ChefHat,
    titleKey: "landing.features.authenticTitle",
    bodyKey: "landing.features.authenticBody",
  },
  {
    icon: Scale,
    titleKey: "landing.features.poundTitle",
    bodyKey: "landing.features.poundBody",
  },
  {
    icon: UserCheck,
    titleKey: "landing.features.guestTitle",
    bodyKey: "landing.features.guestBody",
  },
];

export function LandingFeatures() {
  const { t } = useTranslation();
  return (
    <section className="bg-papel py-16">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
          <div
            key={titleKey}
            className="rounded-2xl bg-papel-warm border border-oro/40 p-6 shadow-cazo-1 flex flex-col gap-3"
          >
            <div className="h-12 w-12 rounded-full bg-nopal text-oro flex items-center justify-center">
              <Icon size={24} strokeWidth={2} />
            </div>
            <h3 className="font-display text-xl font-semibold text-mole">
              {t(titleKey)}
            </h3>
            <p className="text-mole-60 text-sm leading-relaxed">
              {t(bodyKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
