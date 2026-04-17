"use client";

import { useTranslation } from "react-i18next";

export function CateringHowItWorks() {
  const { t } = useTranslation();
  const steps = [
    {
      num: "1",
      titleKey: "catering.howItWorks.step1Title",
      titleFallback: "Tell us about your event",
      bodyKey: "catering.howItWorks.step1Body",
      bodyFallback: "Fill out the quick form with your date, headcount, and vibe.",
    },
    {
      num: "2",
      titleKey: "catering.howItWorks.step2Title",
      titleFallback: "Don Nico reaches out",
      bodyKey: "catering.howItWorks.step2Body",
      bodyFallback:
        "Within 24 hours — by phone, text, or email — to confirm cuts, pricing, and logistics.",
    },
    {
      num: "3",
      titleKey: "catering.howItWorks.step3Title",
      titleFallback: "Feast with your people",
      bodyKey: "catering.howItWorks.step3Body",
      bodyFallback:
        "Pick up or delivery on your event day. Carnitas arrive hot, sides included if you chose them.",
    },
  ];

  return (
    <section className="bg-papel-warm py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl font-bold text-mole text-center mb-8">
          {t("catering.howItWorks.title", "How catering works")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className="rounded-2xl bg-papel border border-nopal/10 p-6 flex flex-col gap-3 relative"
            >
              <div className="h-10 w-10 rounded-full bg-oro text-mole flex items-center justify-center font-display text-xl font-bold">
                {s.num}
              </div>
              <h3 className="font-display text-xl font-semibold text-mole">
                {t(s.titleKey, s.titleFallback)}
              </h3>
              <p className="text-mole/70 text-sm leading-relaxed">
                {t(s.bodyKey, s.bodyFallback)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
