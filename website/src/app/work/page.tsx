import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("work");

export default function WorkIndexPage() {
  return (
    <SectionHubPage
      sectionId="work"
      title="Work"
      summary={getHubLanding("work").purpose}
    />
  );
}
