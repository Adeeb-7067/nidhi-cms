import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("careers");

export default function CareersIndexPage() {
  return (
    <SectionHubPage
      sectionId="careers"
      title="Careers"
      summary="Join a craft-first engineering culture - roles, internships, benefits, and how we hire."
    />
  );
}