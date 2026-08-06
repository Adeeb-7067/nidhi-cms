"use client";

import { memo } from "react";
import { TechStack } from "@/components/digital/TechStack";
import { TestimonialExperience } from "@/components/digital/TestimonialExperience";
import { WhyChooseUs } from "@/components/digital/WhyChooseUs";
import { CompanyScale } from "@/components/digital/CompanyScale";
import { GlobalPresence } from "@/components/digital/GlobalPresence";
import { FinalCta } from "@/components/digital/FinalCta";

/**
 * Supporting depth — the second-order questions a buyer asks once they believe
 * the pitch: what is it built on, who vouches for it, why you rather than the
 * incumbent, and how big is the company really.
 *
 * Memoised for the same reason as `BusinessNarrative`: this tree must not
 * re-reconcile on every scrubbed film frame.
 */
export const SupportingNarrative = memo(function SupportingNarrative() {
  return (
    <div className="relative text-foreground" style={{ zIndex: "var(--z-content)" }}>
      <TechStack />
      <TestimonialExperience />
      <WhyChooseUs />
      <CompanyScale />
      <GlobalPresence />
      <FinalCta />
    </div>
  );
});
