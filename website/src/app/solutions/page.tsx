import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("solutions");

export default function SolutionsIndexPage() {
  return (
    <SectionHubPage
      sectionId="solutions"
      title="Solutions"
      summary={getHubLanding("solutions").purpose}
    />
  );
}
