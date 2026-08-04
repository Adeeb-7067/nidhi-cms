import type { Metadata } from "next";
import { ExperiencePage } from "@/components/experiences/ExperiencePage";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { getIndustry, industryCatalog } from "@/data/catalog";
import { buildExperience, experienceMetadata, leafExperienceMetadata } from "@/data/experiences";
import { getSectionLeaves, sectionSlugs } from "@/data/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  const fromNav = sectionSlugs("industries");
  const fromCatalog = industryCatalog.map((i) => i.slug);
  return [...new Set([...fromNav, ...fromCatalog])].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (industry) {
    const data = buildExperience({
      sectionId: "industries",
      slug,
      title: industry.name,
      summary: industry.overview ?? industry.desc,
      related: [],
    });
    return experienceMetadata(data);
  }
  return leafExperienceMetadata("industries", slug);
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = getIndustry(slug);

  if (!industry) {
    return <LeafMarketingPage sectionId="industries" slug={slug} />;
  }

  const related = getSectionLeaves("industries")
    .filter((l) => !l.href.endsWith(`/${slug}`))
    .slice(0, 6)
    .map((l) => ({ title: l.title, href: l.href, description: l.description }));

  const data = buildExperience({
    sectionId: "industries",
    slug,
    title: industry.name,
    summary: industry.overview,
    related,
  });

  data.chapters = [
    {
      label: "01 · Domain",
      title: "How we show up",
      body: "Pattern libraries, compliance instincts, and product judgment shaped by shipping inside this domain.",
    },
    {
      label: "02 · Capabilities",
      title: "What we bring",
      body: industry.capabilities.join(" · "),
    },
    {
      label: "03 · Outcomes",
      title: "Typical results",
      body: industry.outcomes.join(" · "),
    },
    {
      label: "04 · Partnership",
      title: "Engagement",
      body: industry.desc,
    },
  ];

  return <ExperiencePage data={data} />;
}
