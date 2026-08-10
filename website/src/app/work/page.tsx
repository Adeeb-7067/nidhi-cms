import type { Metadata } from "next";
import { WorkIndexPage } from "@/components/pages/WorkIndexPage";
import { hubMetadata } from "@/data/seo";

export const metadata: Metadata = hubMetadata("work");

export default function WorkPage() {
  return <WorkIndexPage />;
}

