import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("company");

export default function CompanyPage() {
  return (
    <SectionHubPage
      sectionId="company"
      title="Company"
      summary={getHubLanding("company").purpose}
    />
  );
}
