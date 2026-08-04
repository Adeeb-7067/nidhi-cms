import type { ExperienceKind } from "@/data/experiences";
import type { PageComposition } from "./types";
import { bareFallback } from "./helpers";

/**
 * Kind defaults are INTENTIONALLY not full page templates.
 * Every leaf should have an explicit composition in section maps.
 * This map exists only as an emergency bare fallback if a slug is missing.
 */
export const kindDefaultCompositions: Record<ExperienceKind, PageComposition> = {
  "ai-neural": bareFallback,
  "cloud-layers": bareFallback,
  "security-scan": bareFallback,
  "product-lifecycle": bareFallback,
  "healthcare-soft": bareFallback,
  "education-notebook": bareFallback,
  "finance-ledger": bareFallback,
  "industry-atlas": bareFallback,
  "company-manifesto": bareFallback,
  "tech-ecosystem": bareFallback,
  "solutions-blueprint": bareFallback,
  "careers-journey": bareFallback,
  "contact-signal": bareFallback,
  "insights-editorial": bareFallback,
  "work-gallery": bareFallback,
  "default-atelier": bareFallback,
};
