/** Page composition — explicit section lists, never inherited from kind templates. */

export type SectionId =
  | "hero-manifesto"
  | "hero-split"
  | "hero-editorial"
  | "hero-media"
  | "hero-signal"
  | "hero-neural"
  | "hero-cloud"
  | "hero-product"
  | "hero-work"
  | "hero-default"
  | "pills"
  | "highlight-band"
  | "pipeline"
  | "cards"
  | "chapters-grid"
  | "chapters-alternating"
  | "chapters-editorial"
  | "metrics"
  | "gallery"
  | "stack"
  | "timeline"
  | "team-grid"
  | "values"
  | "quote-band"
  | "link-band"
  | "contact-form"
  | "orbit"
  | "lifecycle"
  | "scan"
  | "faq"
  | "cta"
  | "related";

export type TimelineItem = {
  year: string;
  title: string;
  body: string;
};

export type TeamMember = {
  name: string;
  role: string;
  blurb: string;
  image?: string;
};

export type ValueItem = {
  title: string;
  body: string;
};

export type LinkBandItem = {
  title: string;
  href: string;
  description?: string;
};

export type QuoteItem = {
  quote: string;
  name: string;
  role: string;
};

/**
 * Visual placement for reusable blocks.
 * Same content block + different layout = pages stop feeling templated.
 */
export type BlockLayout =
  | "grid"
  | "bento"
  | "rail"
  | "split"
  | "index"
  | "flush"
  | "split-text"
  | "display"
  | "center"
  | "pull"
  | "columns"
  | "stack"
  | "pair"
  | "flow"
  | "ladder"
  | "compact"
  | "magazine"
  | "cascade"
  | "ledger";

export type SectionProps = {
  title?: string;
  eyebrow?: string;
  body?: string;
  /** Visual placement variant for this block */
  layout?: BlockLayout;
  /** Override image for media heroes / galleries */
  image?: string;
  images?: string[];
  timeline?: TimelineItem[];
  team?: TeamMember[];
  values?: ValueItem[];
  links?: LinkBandItem[];
  quotes?: QuoteItem[];
  cards?: { title: string; summary: string; meta?: string }[];
  pipeline?: { step: string; detail: string }[];
  /** Hide section if underlying payload data is empty */
  requireData?: boolean;
};

export type SectionConfig = {
  id: SectionId;
  props?: SectionProps;
};

export type PageComposition = {
  /** Unique motion register for this page */
  motion?: "timeline" | "portraits" | "gallery" | "network" | "signal" | "editorial" | "default";
  sections: SectionConfig[];
};
