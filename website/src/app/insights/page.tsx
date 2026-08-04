import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("insights");

export default function InsightsIndexPage() {
  return (
    <SectionHubPage
      sectionId="insights"
      title="Insights"
      summary="Writing, research, and resources from practitioners who still ship."
    />
  );
}