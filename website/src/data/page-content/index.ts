import type { ExperienceKind } from "@/data/experiences";
import { flattenNavigation } from "@/data/navigation";
import { kindNarratives } from "./kind-narratives";
import { getSlugOverride } from "./slug-overrides";
import type { PageContentPartial, PageCta, PageChapter, PageFaq } from "./types";

export type { PageContentPartial, PageCta, PageChapter, PageFaq } from "./types";
export { getSlugOverride } from "./slug-overrides";
export { kindNarratives } from "./kind-narratives";

export type ResolvedPageContent = {
  summary: string;
  highlight?: string;
  eyebrow?: string;
  watermark?: string;
  pills?: PageContentPartial["pills"];
  pipeline?: PageContentPartial["pipeline"];
  cards?: PageContentPartial["cards"];
  chapters: PageChapter[];
  faqs: PageFaq[];
  metrics?: PageContentPartial["metrics"];
  stack?: PageContentPartial["stack"];
  gallery?: PageContentPartial["gallery"];
  image?: PageContentPartial["image"];
  cta: PageCta;
  seoTitle: string;
  seoDescription: string;
  related?: { title: string; href: string; description: string }[];
};

function resolveRelated(
  hints: string[] | undefined,
  fallback: { title: string; href: string; description: string }[],
) {
  if (!hints?.length) return fallback;
  const nav = flattenNavigation();
  const fromHints = hints
    .map((href) => {
      const hit = nav.find((n) => n.href === href);
      if (!hit) return { title: href.split("/").pop()?.replace(/-/g, " ") ?? href, href, description: "" };
      return { title: hit.title, href: hit.href, description: hit.description };
    })
    .filter(Boolean);
  const extras = fallback.filter((f) => !fromHints.some((h) => h.href === f.href));
  return [...fromHints, ...extras].slice(0, 6);
}

export function resolvePageContent(input: {
  sectionId: string;
  slug: string;
  title: string;
  summary: string;
  kind: ExperienceKind;
  related: { title: string; href: string; description: string }[];
}): ResolvedPageContent {
  const narrative = kindNarratives[input.kind];
  const override = getSlugOverride(input.sectionId, input.slug);
  const summary = override?.summary ?? input.summary;
  const chapters = override?.chapters ?? narrative.chapters(input.title, summary);
  const faqs = override?.faqs ?? narrative.faqs(input.title);
  const cta = override?.cta ?? narrative.cta;
  const relatedHints = override?.relatedHints ?? narrative.relatedHints;

  return {
    summary,
    highlight: override?.highlight ?? narrative.highlight,
    eyebrow: override?.eyebrow,
    watermark: override?.watermark ?? cta.watermark,
    pills: override?.pills,
    pipeline: override?.pipeline,
    cards: override?.cards,
    chapters,
    faqs,
    metrics: override?.metrics,
    stack: override?.stack,
    gallery: override?.gallery,
    image: override?.image,
    cta,
    seoTitle: override?.seoTitle ?? `${input.title} — Satyakabir Technologies`,
    seoDescription:
      override?.seoDescription ??
      (((summary.length > 155 ? `${summary.slice(0, 152).trim()}…` : summary) ||
        `${input.title} from Satyakabir Technologies.`)),
    related: resolveRelated(relatedHints, input.related),
  };
}
