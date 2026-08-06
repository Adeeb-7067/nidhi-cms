import type { Metadata } from "next";
import { ExperiencePage } from "@/components/experiences/ExperiencePage";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { getCaseStudy } from "@/data/case-studies";
import { getProject, projectCatalog } from "@/data/catalog";
import {
  buildExperience,
  experienceMetadata,
  leafExperienceMetadata,
  type ExperiencePayload,
} from "@/data/experiences";
import { getSectionLeaves, sectionSlugs } from "@/data/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const fromNav = sectionSlugs("work");
  const fromCatalog = projectCatalog.map((p) => p.slug);
  return [...new Set([...fromNav, ...fromCatalog])].map((slug) => ({ slug }));
}

function applyCaseStudy(
  data: ExperiencePayload,
  slug: string,
  projectName: string,
  projectImage: string,
): ExperiencePayload {
  const study = getCaseStudy(slug);
  if (!study) {
    return data;
  }

  data.kind = "work-gallery";
  data.title = study.name;
  data.summary = study.summary;
  data.promise = study.headline;
  data.eyebrow = `Work · Case study`;
  data.highlight = study.headline;
  data.accent = study.accent;
  data.image = study.image || projectImage;
  data.gallery = study.gallery;
  data.pills = study.pills;
  data.stack = study.stack;
  data.pipeline = study.pipeline;
  data.cards = study.cards;
  data.metrics = study.metrics;
  data.trust = study.metrics.slice(0, 4);
  data.outcomes = study.metrics.slice(0, 3).map((m) => `${m.value} ${m.label}`);
  data.chapters = study.chapters;
  data.faqs = study.faqs;
  data.cta = study.cta;
  data.watermark = study.cta.watermark;
  data.seoTitle = study.seoTitle;
  data.seoDescription = study.seoDescription;
  data.caseBrief = {
    client: study.client,
    sector: study.sector,
    engagement: study.engagement,
    duration: study.duration,
    challenge: study.challenge,
    solution: study.solution,
  };
  data.related = [
    ...study.relatedServices.map((l) => ({
      title: l.title,
      href: l.href,
      description: l.description ?? "",
    })),
    ...projectCatalog
      .filter((p) => p.slug !== slug)
      .slice(0, 3)
      .map((p) => ({ title: p.name, href: p.href, description: p.desc })),
  ].slice(0, 6);

  // Keep title aligned if catalog name differs slightly
  if (!data.title) data.title = projectName;

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (project) {
    const data = buildExperience({
      sectionId: "work",
      slug,
      title: project.name,
      summary: project.desc,
      related: [],
    });
    applyCaseStudy(data, slug, project.name, project.image);
    return experienceMetadata(data);
  }
  return leafExperienceMetadata("work", slug);
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return <LeafMarketingPage sectionId="work" slug={slug} />;
  }

  const related = [
    ...projectCatalog
      .filter((p) => p.slug !== slug)
      .slice(0, 3)
      .map((p) => ({ title: p.name, href: p.href, description: p.desc })),
    ...getSectionLeaves("work")
      .slice(0, 3)
      .map((l) => ({ title: l.title, href: l.href, description: l.description })),
  ].slice(0, 6);

  const data = buildExperience({
    sectionId: "work",
    slug,
    title: project.name,
    summary: project.desc,
    related,
  });

  const study = getCaseStudy(slug);
  if (study) {
    applyCaseStudy(data, slug, project.name, project.image);
  } else {
    // Thin fallback if a catalog project lacks a rich case study
    data.kind = "work-gallery";
    data.image = project.image;
    data.gallery = [project.image, ...data.gallery.filter((g) => g !== project.image)].slice(0, 3);
    data.stack = [...project.tags];
    data.pills = [...new Set([...project.tags, ...data.pills])].slice(0, 10);
    data.cards = project.highlights.slice(0, 4).map((h, i) => ({
      title: ["Problem frame", "Architecture", "Delivery", "Impact"][i] ?? `Note ${i + 1}`,
      summary: h,
      meta: "Case",
    }));
    data.chapters = [
      { label: "01 · Challenge", title: "The brief", body: project.challenge },
      { label: "02 · Solution", title: "What we built", body: project.solution },
      { label: "03 · Highlights", title: "Craft notes", body: project.highlights.join(" · ") },
      {
        label: "04 · Outcomes",
        title: "Proof",
        body: project.results.map((r) => `${r.value} — ${r.label}`).join(" · "),
      },
    ];
    data.metrics = project.results.slice(0, 4).map((r) => ({
      value: r.value,
      label: r.label,
    }));
    data.highlight = `${project.metric} ${project.metricLabel} · ${project.sector}`;
    data.promise = project.desc;
    data.eyebrow = "Work · Case study";
    data.trust = project.results.slice(0, 4).map((r) => ({
      value: r.value,
      label: r.label,
    }));
    data.outcomes = [
      `${project.metric} ${project.metricLabel}`,
      project.sector,
      "Principal-led delivery",
    ];
    data.caseBrief = {
      client: "Confidential",
      sector: project.sector,
      engagement: "Embedded squad",
      duration: "Scoped engagement",
      challenge: project.challenge,
      solution: project.solution,
    };
  }

  return <ExperiencePage data={data} />;
}
