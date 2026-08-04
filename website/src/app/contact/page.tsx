import type { Metadata } from "next";
import { SectionHubPage } from "@/components/pages/SectionPages";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("contact");

export default function ContactIndexPage() {
  return (
    <SectionHubPage
      sectionId="contact"
      title="Contact"
      summary="Talk with a principal, book a meeting, request a quote, or find our offices."
    />
  );
}