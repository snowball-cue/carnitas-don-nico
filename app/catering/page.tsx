import { CateringHeroTitle } from "./CateringHeroTitle";
import { CateringHeroCta } from "./CateringHeroCta";
import { CateringRequestForm } from "./CateringRequestForm";
import { CateringFAQ } from "./CateringFAQ";
import { CateringHowItWorks } from "./CateringHowItWorks";
import { CateringFeatures } from "./CateringFeatures";

export const metadata = {
  title: "Catering — Carnitas Don Nico",
  description:
    "Carnitas catering for quinceañeras, weddings, work lunches, and parties of 10+. Slow-cooked in a copper cazo, delivered or ready for pickup.",
};

export default function CateringPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-nopal text-papel relative overflow-hidden">
        <div className="container mx-auto px-4 py-14 md:py-20 flex flex-col items-center text-center gap-4">
          <CateringHeroTitle />
          <div className="mt-2">
            <CateringHeroCta />
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <CateringFeatures />

      {/* How it works */}
      <CateringHowItWorks />

      {/* Request form */}
      <CateringRequestForm />

      {/* FAQ */}
      <CateringFAQ />
    </div>
  );
}
