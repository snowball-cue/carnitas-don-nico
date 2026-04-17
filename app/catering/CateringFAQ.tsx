"use client";

import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const KEYS = [
  "howFar",
  "travel",
  "bulk",
  "whatsIncluded",
  "deposit",
  "cancellations",
] as const;

export function CateringFAQ() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="font-display text-3xl font-bold text-mole mb-4 text-center">
        {t("catering.faq.title", "Common questions")}
      </h2>
      <p className="text-mole/70 text-center mb-6">
        {t(
          "catering.faq.subtitle",
          "If you don't see your question here, just drop it in the notes box above.",
        )}
      </p>
      <Accordion type="single" collapsible className="w-full">
        {KEYS.map((k) => (
          <AccordionItem key={k} value={k}>
            <AccordionTrigger>
              {t(`catering.faq.${k}.q`, `catering.faq.${k}.q`)}
            </AccordionTrigger>
            <AccordionContent>
              {t(`catering.faq.${k}.a`, `catering.faq.${k}.a`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
