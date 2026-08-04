import Link from "next/link";
import { PremiumNavbar } from "@/components/nav/PremiumNavbar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { site } from "@/data/mock";
import { ctaNav } from "@/data/navigation";

export function SiteFooter() {
  return (
    <footer className="relative mt-16 border-t border-border md:mt-24">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-24"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(43,107,255,0.08))",
        }}
      />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-12">
        <div>
          <p className="text-subhead text-foreground">Satyakabir</p>
          <p className="text-small mt-2 max-w-md text-measure">{site.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <Link href="/company" className="text-label text-muted-foreground transition-colors hover:text-foreground">
            Company
          </Link>
          <Link href="/services" className="text-label text-muted-foreground transition-colors hover:text-foreground">
            Services
          </Link>
          <Link href="/work" className="text-label text-muted-foreground transition-colors hover:text-foreground">
            Work
          </Link>
          <Link href={ctaNav.href} className="text-label text-brand-cyan transition-colors hover:text-foreground">
            Start a project
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-5 md:px-8 sm:flex-row sm:justify-between">
          <p className="text-meta text-muted-foreground">{site.copyright}</p>
          <a href={`mailto:${site.email}`} className="text-label text-muted-foreground hover:text-foreground">
            {site.email}
          </a>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({
  children,
  crumbs,
}: {
  children: React.ReactNode;
  crumbs?: { label: string; href: string }[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PremiumNavbar variant="site" />
      <main className="page-offset relative">
        <div className="layout-grid pt-6 md:pt-8">
          {crumbs ? <Breadcrumbs items={crumbs} /> : null}
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
