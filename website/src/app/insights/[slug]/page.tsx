import type { Metadata } from "next";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { InsightsCatalogPage } from "@/components/pages/InsightsCatalogPage";
import { leafExperienceMetadata } from "@/data/experiences";
import { sectionSlugs } from "@/data/navigation";

export function generateStaticParams() {
  return sectionSlugs("insights").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return leafExperienceMetadata("insights", slug);
}

export default async function InsightsLeafPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (
    ["blog", "whitepapers", "technology-articles", "research", "resources"].includes(
      slug,
    )
  ) {
    return <InsightsCatalogPage currentSlug={slug} />;
  }
  return <LeafMarketingPage sectionId="insights" slug={slug} />;
}

