import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("industries");

export default function IndustriesIndexPage() {
  return (
    <SectionHubPage
      sectionId="industries"
      title="Industries"
      summary="Domain-fluent engineering for regulated and high-growth markets."
    />
  );
}