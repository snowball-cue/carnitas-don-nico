import Link from "next/link";
import { ChefHat, Scale, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LandingHero } from "./_landing/LandingHero";
import { LandingFeatures } from "./_landing/LandingFeatures";
import { LandingHowItWorks } from "./_landing/LandingHowItWorks";
import { LandingUrgencyBanner } from "./_landing/LandingUrgencyBanner";

export const revalidate = 60;

async function getNextPickup() {
  try {
    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("pickup_dates")
      .select(
        "id, pickup_date, pickup_window_start, pickup_window_end, capacity_lbs, reserved_lbs, cutoff_at, is_open",
      )
      .eq("is_open", true)
      .gte("pickup_date", today)
      .order("pickup_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const nextPickup = await getNextPickup();

  return (
    <div>
      <LandingHero />
      {nextPickup ? <LandingUrgencyBanner pickup={nextPickup} /> : null}
      <LandingFeatures />
      <LandingHowItWorks />
    </div>
  );
}

// Re-export so consumers can use these as server components or client islands.
export { Link, Button, Logo, ChefHat, Scale, UserCheck };
