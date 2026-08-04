"use client";

import { PremiumNavbar } from "@/components/nav/PremiumNavbar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SiteFooter } from "@/components/pages/MarketingShell";
import type { ExperiencePayload } from "@/data/experiences";
import { breadcrumbsFor } from "@/data/navigation";
import { ExperienceComposer } from "@/components/experiences/ExperienceComposer";
import { absoluteUrl, breadcrumbJsonLd } from "@/data/seo";

export function ExperienceShell({
  crumbsHref,
  children,
  accent = "#2B6BFF",
}: {
  crumbsHref: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 opacity-80 dark:opacity-90"
        style={{
          background: `
            radial-gradient(900px 520px at 12% -8%, ${accent}22, transparent 55%),
            radial-gradient(700px 420px at 92% 18%, rgba(0,217,255,0.08), transparent 50%),
            radial-gradient(600px 380px at 50% 100%, color-mix(in oklab, var(--foreground) 4%, transparent), transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 animate-[mesh-shift_28s_ease-in-out_infinite] opacity-30 mix-blend-multiply dark:opacity-40 dark:mix-blend-screen"
        style={{
          background:
            "radial-gradient(40% 30% at 20% 40%, rgba(43,107,255,0.14), transparent), radial-gradient(35% 28% at 80% 60%, rgba(0,217,255,0.1), transparent)",
        }}
      />
      <PremiumNavbar variant="site" />
      <div className="page-offset relative z-10">
        <div className="page-pad mx-auto max-w-[1200px] pt-6 md:pt-8">
          <Breadcrumbs items={breadcrumbsFor(crumbsHref)} />
        </div>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

/**
 * Experience pages are composed from an explicit section list (page composition),
 * not from kind templates. Kinds only supply design tokens + lean defaults when
 * a page has not declared its own composition.
 */
export function ExperiencePage({ data }: { data: ExperiencePayload }) {
  const crumbs = breadcrumbsFor(`/${data.sectionId}/${data.slug}`);
  const crumbLd = breadcrumbJsonLd(
    crumbs.map((c) => ({ name: c.label, path: c.href === "#" ? `/${data.sectionId}/${data.slug}` : c.href })),
  );
  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.seoTitle || data.title,
    description: data.seoDescription || data.summary,
    url: absoluteUrl(`/${data.sectionId}/${data.slug}`),
    isPartOf: { "@type": "WebSite", name: "Satyakabir Technologies", url: absoluteUrl("/") },
    about: data.title,
  };
  const faqLd =
    data.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: data.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <ExperienceShell crumbsHref={`/${data.sectionId}/${data.slug}`} accent={data.accent}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }} />
      {faqLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      ) : null}
      <div className="pb-8 md:pb-12">
        <ExperienceComposer data={data} />
      </div>
    </ExperienceShell>
  );
}
