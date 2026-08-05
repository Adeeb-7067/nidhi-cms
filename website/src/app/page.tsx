import type { Metadata } from "next";
import CinematicHome from "@/components/CinematicHome";
import { homeMetadata } from "@/data/seo";

export const metadata: Metadata = homeMetadata();

export default function HomePage() {
  return (
    <>
      <link rel="preload" as="image" href="/TITLE__Satyakabir_Technologies.poster.jpg" />
      <link
        rel="preload"
        as="video"
        href="/TITLE__Satyakabir_Technologies.scrub.mp4"
        type="video/mp4"
      />
      <CinematicHome />
    </>
  );
}
