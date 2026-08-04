import type { Metadata } from "next";
import CinematicHome from "@/components/CinematicHome";
import { homeMetadata } from "@/data/seo";

export const metadata: Metadata = homeMetadata();

export default function HomePage() {
  return <CinematicHome />;
}
