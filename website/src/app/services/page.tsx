import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("services");

export default function ServicesIndexPage() {
  return (
    <SectionHubPage
      sectionId="services"
      title="Services"
      summary="Practice areas spanning intelligence systems, product platforms, cloud engineering, and assurance."
    />
  );
}