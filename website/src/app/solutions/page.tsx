import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("solutions");

export default function SolutionsIndexPage() {
  return (
    <SectionHubPage
      sectionId="solutions"
      title="Solutions"
      summary="Outcome-shaped platforms across ERP, CRM, industry verticals, startups, and enterprise programs."
    />
  );
}