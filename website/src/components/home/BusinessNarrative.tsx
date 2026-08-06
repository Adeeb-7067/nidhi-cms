"use client";

import { memo } from "react";
import { TrustImpact } from "@/components/digital/TrustImpact";
import { IndustryWall } from "@/components/digital/IndustryWall";
import { IndustriesTransform } from "@/components/digital/IndustriesTransform";
import { BusinessResults } from "@/components/digital/BusinessResults";
import { DigitalTransformation } from "@/components/digital/DigitalTransformation";
import { ServicesEcosystem } from "@/components/digital/ServicesEcosystem";
import { CaseStudies } from "@/components/digital/CaseStudies";

/**
 * The business case — the argument the film cannot make on its own.
 *
 * Order is the argument: who we have done it for (trust, industries), what
 * changed (results), how we do it (transformation, ecosystem), then proof at
 * depth (case studies).
 *
 * Memoised: the parent re-renders on every scrubbed film frame, and
 * re-reconciling seven sections at 60fps starves the scrubber. Takes no props,
 * so this renders exactly once.
 */
export const BusinessNarrative = memo(function BusinessNarrative() {
  return (
    <div className="relative text-foreground" style={{ zIndex: "var(--z-content)" }}>
      <TrustImpact />
      <IndustryWall />
      <IndustriesTransform />
      <BusinessResults />
      <DigitalTransformation />
      <ServicesEcosystem />
      <CaseStudies />
    </div>
  );
});
