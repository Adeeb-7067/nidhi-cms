import type { Metadata } from "next";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { CareersBoardPage } from "@/components/pages/CareersBoardPage";
import { leafExperienceMetadata } from "@/data/experiences";
import { sectionSlugs } from "@/data/navigation";

export function generateStaticParams() {
  return sectionSlugs("careers").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return leafExperienceMetadata("careers", slug);
}

export default async function CareersLeafPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "open-positions" || slug === "internships") {
    return <CareersBoardPage isInternshipOnly={slug === "internships"} />;
  }
  return <LeafMarketingPage sectionId="careers" slug={slug} />;
}

