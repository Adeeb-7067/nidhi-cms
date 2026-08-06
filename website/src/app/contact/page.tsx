import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { getHubLanding } from "@/data/first-viewport";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("contact");

export default function ContactIndexPage() {
  return (
    <SectionHubPage
      sectionId="contact"
      title="Contact"
      summary={getHubLanding("contact").purpose}
    />
  );
}
