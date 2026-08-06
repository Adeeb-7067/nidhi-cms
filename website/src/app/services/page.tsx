import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("services");

export default function ServicesIndexPage() {
  return (
    <SectionHubPage
      sectionId="services"
      title="Services"
      summary={getHubLanding("services").purpose}
    />
  );
}
