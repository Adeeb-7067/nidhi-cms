import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("technologies");

export default function TechnologiesIndexPage() {
  return (
    <SectionHubPage
      sectionId="technologies"
      title="Technologies"
      summary="Primitives we ship with - frontend, backend, cloud, AI models, data, and mobile."
    />
  );
}