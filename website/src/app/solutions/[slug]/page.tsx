import type { Metadata } from "next";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { leafExperienceMetadata } from "@/data/experiences";
import { sectionSlugs } from "@/data/navigation";

export function generateStaticParams() {
  return sectionSlugs("solutions").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return leafExperienceMetadata("solutions", slug);
}

export default async function SolutionsLeafPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LeafMarketingPage sectionId="solutions" slug={slug} />;
}
