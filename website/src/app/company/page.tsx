import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("company");

export default function CompanyPage() {
  return (
    <SectionHubPage
      sectionId="company"
      title="Company"
      summary="The people, principles, and presence behind Satyakabir Technologies - from headquarters culture to global delivery."
    />
  );
}