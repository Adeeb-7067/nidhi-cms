import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("work");

export default function WorkIndexPage() {
  return (
    <SectionHubPage
      sectionId="work"
      title="Work"
      summary="Selected builds, case studies, and the gallery of craft behind Satyakabir Technologies."
    />
  );
}