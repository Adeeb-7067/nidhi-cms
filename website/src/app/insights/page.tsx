import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("insights");

export default function InsightsIndexPage() {
  return (
    <SectionHubPage
      sectionId="insights"
      title="Insights"
      summary={getHubLanding("insights").purpose}
    />
  );
}
