import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("careers");

export default function CareersIndexPage() {
  return (
    <SectionHubPage
      sectionId="careers"
      title="Careers"
      summary={getHubLanding("careers").purpose}
    />
  );
}
