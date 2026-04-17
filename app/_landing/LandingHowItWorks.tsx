"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export function LandingHowItWorks() {
  const { t } = useTranslation();
  const steps = [
    {
      n: 1,
      titleKey: "landing.howItWorks.step1Title",
      bodyKey: "landing.howItWorks.step1Body",
    },
    {
      n: 2,
      titleKey: "landing.howItWorks.step2Title",
      bodyKey: "landing.howItWorks.step2Body",
    },
    {
      n: 3,
      titleKey: "landing.howItWorks.step3Title",
      bodyKey: "landing.howItWorks.step3Body",
    },
  ];
  return (
    <section className="bg-papel-warm py-16 border-t border-oro/30">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-4xl text-center text-mole mb-10">
          {t("landing.howItWorks.title")}
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <li key={step.n} className="flex flex-col items-center text-center gap-3">
              <span className="h-14 w-14 rounded-full bg-oro text-nopal-dark font-display text-2xl font-bold flex items-center justify-center shadow-cazo-1">
                {step.n}
              </span>
              <h3 className="font-display text-xl font-semibold text-mole">
                {t(step.titleKey)}
              </h3>
              <p className="text-mole-60 text-sm max-w-xs leading-relaxed">
                {t(step.bodyKey)}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <p className="text-xs uppercase tracking-widest text-mole/60">
            {t("landing.pickupArea.label", "Pickup area")}
          </p>
          <p className="font-display text-lg text-mole mt-1">
            {process.env.NEXT_PUBLIC_PICKUP_AREA || "Kyle, Texas 78640"}
          </p>
          <p className="text-xs text-mole/60 mt-1">
            {t(
              "landing.pickupArea.hint",
              "Full address shared after you place your order.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
