import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("technologies");

export default function TechnologiesIndexPage() {
  return (
    <SectionHubPage
      sectionId="technologies"
      title="Technologies"
      summary={getHubLanding("technologies").purpose}
    />
  );
}
