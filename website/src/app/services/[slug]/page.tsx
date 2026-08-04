import type { Metadata } from "next";
import { ExperiencePage } from "@/components/experiences/ExperiencePage";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { getService, serviceCatalog } from "@/data/catalog";
import { buildExperience, experienceMetadata, leafExperienceMetadata } from "@/data/experiences";
import { getSectionLeaves, sectionSlugs } from "@/data/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const fromNav = sectionSlugs("services");
  const fromCatalog = serviceCatalog.map((s) => s.slug);
  return [...new Set([...fromNav, ...fromCatalog])].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (service) {
    const data = buildExperience({
      sectionId: "services",
      slug,
      title: service.name,
      summary: service.desc,
      related: [],
    });
    return experienceMetadata(data);
  }
  return leafExperienceMetadata("services", slug);
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    return <LeafMarketingPage sectionId="services" slug={slug} />;
  }

  const related = getSectionLeaves("services")
    .filter((l) => !l.href.endsWith(`/${slug}`))
    .slice(0, 6)
    .map((l) => ({ title: l.title, href: l.href, description: l.description }));

  const data = buildExperience({
    sectionId: "services",
    slug,
    title: service.name,
    summary: service.desc,
    related,
  });

  data.chapters = [
    { label: "01 · Challenge", title: "The pressure", body: service.challenge },
    { label: "02 · Approach", title: "How we respond", body: service.approach },
    {
      label: "03 · Deliverables",
      title: "What you receive",
      body: service.deliverables.join(" · "),
    },
    { label: "04 · Timeline", title: "Cadence", body: service.timeline },
  ];
  data.stack = [...new Set([...data.stack, ...service.deliverables])].slice(0, 8);
  data.pills = [...new Set([...data.pills, ...service.outcomes, ...service.deliverables])].slice(0, 10);
  data.cards = service.deliverables.slice(0, 4).map((d, i) => ({
    title: d,
    summary: service.outcomes[i] ?? service.approach,
    meta: "Deliverable",
  }));
  data.metrics = [
    { value: "Prod", label: "Ready systems" },
    { value: service.timeline.split("·")[0]?.trim() || "Scoped", label: "First slice" },
    { value: `${service.outcomes.length}+`, label: "Outcome lanes" },
    { value: "1:1", label: "Principal access" },
  ];

  return <ExperiencePage data={data} />;
}
