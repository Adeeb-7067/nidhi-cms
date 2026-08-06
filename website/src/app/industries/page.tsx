import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("industries");

export default function IndustriesIndexPage() {
  return (
    <SectionHubPage
      sectionId="industries"
      title="Industries"
      summary={getHubLanding("industries").purpose}
    />
  );
}
