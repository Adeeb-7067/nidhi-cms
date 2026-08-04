import type { PageComposition } from "./types";

/** Catalog industry slugs (mock.ts) — separate from nav industry leaves. */
export const industryCatalogCompositions: Record<string, PageComposition> = {
  "fintech-and-banking": {
    motion: "editorial",
    sections: [
      { id: "hero-split" },
      { id: "metrics" },
      { id: "chapters-alternating" },
      { id: "cards", props: { title: "Banking capabilities" } },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "healthtech-and-life-sciences": {
    motion: "editorial",
    sections: [
      { id: "hero-media" },
      { id: "highlight-band" },
      { id: "pipeline", props: { title: "Healthtech path" } },
      { id: "chapters-editorial" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "edtech-and-e-learning": {
    motion: "gallery",
    sections: [
      { id: "hero-media" },
      { id: "gallery" },
      { id: "chapters-grid" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "retail-and-e-commerce": {
    motion: "default",
    sections: [
      { id: "hero-product" },
      { id: "lifecycle" },
      { id: "chapters-alternating" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "enterprise-saas": {
    motion: "network",
    sections: [
      { id: "hero-cloud" },
      { id: "pipeline", props: { title: "SaaS industry path" } },
      { id: "chapters-grid" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "government-and-public-sector": {
    motion: "editorial",
    sections: [
      { id: "hero-editorial" },
      {
        id: "values",
        props: {
          title: "Public sector",
          values: [
            { title: "Trust", body: "Citizen-grade accessibility and auditability." },
            { title: "Continuity", body: "Systems that survive transitions." },
            { title: "Security", body: "Oversight-ready controls." },
          ],
        },
      },
      { id: "chapters-editorial" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "manufacturing-and-logistics": {
    motion: "network",
    sections: [
      { id: "hero-cloud" },
      { id: "scan" },
      { id: "chapters-alternating" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "media-and-entertainment": {
    motion: "gallery",
    sections: [
      { id: "hero-media" },
      { id: "gallery" },
      { id: "chapters-grid" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
};
