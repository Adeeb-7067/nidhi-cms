"use client";

import type { ExperiencePayload } from "@/data/experiences";
import { resolveComposition } from "@/data/page-compositions";
import type { SectionConfig, SectionId } from "@/data/page-compositions/types";
import * as S from "@/components/experiences/sections/SectionBlocks";

type SectionComponent = React.FC<{ data: ExperiencePayload; props?: SectionConfig["props"] }>;

const registry: Record<SectionId, SectionComponent> = {
  "hero-manifesto": S.SectionHeroManifesto,
  "hero-split": S.SectionHeroSplit,
  "hero-editorial": S.SectionHeroEditorial,
  "hero-media": S.SectionHeroMedia,
  "hero-signal": S.SectionHeroSignal,
  "hero-neural": S.SectionHeroNeural,
  "hero-cloud": S.SectionHeroCloud,
  "hero-product": S.SectionHeroProduct,
  "hero-work": S.SectionHeroWork,
  "hero-default": S.SectionHeroDefault,
  pills: S.SectionPills,
  "highlight-band": S.SectionHighlightBand,
  "case-brief": S.SectionCaseBrief,
  pipeline: S.SectionPipeline,
  cards: S.SectionCards,
  "chapters-grid": S.SectionChaptersGrid,
  "chapters-alternating": S.SectionChaptersAlternating,
  "chapters-editorial": S.SectionChaptersEditorial,
  metrics: S.SectionMetrics,
  gallery: S.SectionGallery,
  stack: S.SectionStack,
  timeline: S.SectionTimeline,
  "team-grid": S.SectionTeamGrid,
  values: S.SectionValues,
  "quote-band": S.SectionQuoteBand,
  "link-band": S.SectionLinkBand,
  "contact-form": S.SectionContactForm,
  orbit: S.SectionOrbit,
  lifecycle: S.SectionLifecycle,
  scan: S.SectionScan,
  faq: S.SectionFaq,
  cta: S.SectionCta,
  related: S.SectionRelated,
};

export function ExperienceComposer({ data }: { data: ExperiencePayload }) {
  const composition = resolveComposition(data.sectionId, data.slug, data.kind);

  return (
    <div data-motion={composition.motion ?? "default"}>
      {composition.sections.map((section, index) => {
        const Component = registry[section.id];
        if (!Component) return null;
        return <Component key={`${section.id}-${index}`} data={data} props={section.props} />;
      })}
    </div>
  );
}
