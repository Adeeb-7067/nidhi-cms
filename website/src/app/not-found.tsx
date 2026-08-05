import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE_ICONS } from "@/data/seo";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist on Satyakabir Technologies.",
  robots: { index: false, follow: true },
  icons: SITE_ICONS,
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <Logo size="lg" className="mx-auto mb-6 opacity-90" />
        <p className="mb-3 font-deco text-[14px] tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mb-3 font-display text-5xl text-foreground">Page not found</h1>
        <p className="mb-8 text-label text-muted-foreground">This link doesn’t lead anywhere.</p>
        <Link
          href="/"
          className="inline-flex rounded-full bg-[linear-gradient(115deg,#2B6BFF,#00D9FF)] px-7 py-3 text-label text-foreground"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
