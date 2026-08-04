import { PremiumNavbar } from "@/components/nav/PremiumNavbar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SiteFooter } from "@/components/pages/MarketingShell";

export function DetailShell({
  children,
  eyebrow,
  title,
  summary,
  crumbs,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  summary: string;
  crumbs?: { label: string; href: string }[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PremiumNavbar variant="site" />
      <main className="mx-auto max-w-[1200px] px-5 md:px-8 pb-20 pt-24 md:pt-28">
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        <div className="mb-10 md:mb-14">
          <p className="text-eyebrow text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1.05] tracking-[0.02em] text-foreground max-w-3xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] md:text-[16px] text-secondary-foreground leading-relaxed">
            {summary}
          </p>
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
