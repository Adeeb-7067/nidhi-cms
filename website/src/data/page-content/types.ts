import type {
  ExperienceCard,
  ExperienceKind,
  ExperiencePipelineStep,
} from "@/data/experiences";

export type PageCta = {
  eyebrow: string;
  headline: string;
  supporting: string;
  label: string;
  href: string;
  watermark?: string;
};

export type PageChapter = {
  label: string;
  title: string;
  body: string;
};

export type PageFaq = {
  q: string;
  a: string;
};

export type PageContentPartial = {
  summary?: string;
  highlight?: string;
  eyebrow?: string;
  watermark?: string;
  pills?: string[];
  pipeline?: ExperiencePipelineStep[];
  cards?: ExperienceCard[];
  chapters?: PageChapter[];
  faqs?: PageFaq[];
  metrics?: { value: string; label: string }[];
  stack?: string[];
  gallery?: string[];
  image?: string;
  cta?: PageCta;
  seoTitle?: string;
  seoDescription?: string;
  /** Preferred related hrefs; resolved against live navigation when possible */
  relatedHints?: string[];
};

export type KindNarrative = {
  highlight: string;
  chapters: (title: string, summary: string) => PageChapter[];
  faqs: (title: string) => PageFaq[];
  cta: PageCta;
  relatedHints: string[];
};

export type KindNarrativeMap = Record<ExperienceKind, KindNarrative>;
