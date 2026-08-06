import { PremiumNavbar } from "@/components/nav/PremiumNavbar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SiteFooter } from "@/components/nav/SiteFooter";

/**
 * Re-exported for the shells that already import it from here. The footer itself
 * lives in `nav/SiteFooter.tsx` — it is site chrome, not marketing-page chrome,
 * and the homepage needs it too.
 */
export { SiteFooter };

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
