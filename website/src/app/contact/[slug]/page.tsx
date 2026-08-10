import type { Metadata } from "next";
import { LeafMarketingPage } from "@/components/pages/SectionPages";
import { QuotePage } from "@/components/pages/QuotePage";
import { BookMeetingPage } from "@/components/pages/BookMeetingPage";
import { leafExperienceMetadata } from "@/data/experiences";
import { sectionSlugs } from "@/data/navigation";

export function generateStaticParams() {
  return sectionSlugs("contact").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return leafExperienceMetadata("contact", slug);
}

export default async function ContactLeafPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "get-quote") return <QuotePage />;
  if (slug === "book-meeting") return <BookMeetingPage />;
  return <LeafMarketingPage sectionId="contact" slug={slug} />;
}

