import type { Metadata } from "next";
import { ExperiencePage } from "@/components/experiences/ExperiencePage";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { getProject, projectCatalog } from "@/data/catalog";
import { buildExperience, experienceMetadata, leafExperienceMetadata } from "@/data/experiences";
import { getSectionLeaves, sectionSlugs } from "@/data/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const fromNav = sectionSlugs("work");
  const fromCatalog = projectCatalog.map((p) => p.slug);
  return [...new Set([...fromNav, ...fromCatalog])].map((slug) => ({ slug }));
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
      body: project.results.map((r) => `${r.value} ${r.label}`).join(" · "),
    },
  ];
  data.metrics = project.results.slice(0, 4).map((r) => ({
    value: r.value,
    label: r.label,
  }));
  data.highlight = `${project.metric} ${project.metricLabel} · ${project.sector}`;

  return <ExperiencePage data={data} />;
}
