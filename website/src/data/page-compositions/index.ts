import type { ExperienceKind } from "@/data/experiences";
import { careersCompositions } from "./careers";
import { companyCompositions } from "./company";
import { contactCompositions, insightsCompositions } from "./contact-insights";
import { kindDefaultCompositions } from "./defaults";
import { bareFallback } from "./helpers";
import { industriesCompositions as navIndustries } from "./industries";
import { industryCatalogCompositions } from "./industry-catalog";
import { servicesCompositions } from "./services";
import { solutionsCompositions } from "./solutions";
import { technologiesCompositions } from "./technologies";
import type { PageComposition } from "./types";
import { workCompositions } from "./work";

export type { PageComposition, SectionConfig, SectionId, SectionProps } from "./types";
export { companyCompositions } from "./company";
export { careersCompositions } from "./careers";
export { servicesCompositions } from "./services";
export { solutionsCompositions } from "./solutions";
export { technologiesCompositions } from "./technologies";
export { workCompositions } from "./work";
export { contactCompositions, insightsCompositions } from "./contact-insights";

export const industriesCompositions: Record<string, PageComposition> = {
  ...navIndustries,
  ...industryCatalogCompositions,
};

const sectionMaps: Record<string, Record<string, PageComposition>> = {
  company: companyCompositions,
  careers: careersCompositions,
  services: servicesCompositions,
  solutions: solutionsCompositions,
  technologies: technologiesCompositions,
  industries: industriesCompositions,
  work: workCompositions,
  insights: insightsCompositions,
  contact: contactCompositions,
};

/**
 * Resolve page composition.
 * Every leaf should have an explicit entry. Kind defaults are bare emergencies only.
 */
export function resolveComposition(
  sectionId: string,
  slug: string,
  kind: ExperienceKind,
): PageComposition {
  const fromSection = sectionMaps[sectionId]?.[slug];
  if (fromSection) return fromSection;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[composition] Missing explicit layout for /${sectionId}/${slug} (kind=${kind}). Using bare fallback.`,
    );
  }

  return kindDefaultCompositions[kind] ?? bareFallback;
}

export function missingCompositions(sectionId: string, slugs: string[]): string[] {
  const map = sectionMaps[sectionId] ?? {};
  return slugs.filter((slug) => !map[slug]);
}
