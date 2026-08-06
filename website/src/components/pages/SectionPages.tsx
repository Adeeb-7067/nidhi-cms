import Link from "next/link";
import { ExperiencePage } from "@/components/experiences/ExperiencePage";
import { PurposeChrome } from "@/components/experiences/PurposeChrome";
import { MarketingShell } from "@/components/pages/MarketingShell";
import { buildExperience } from "@/data/experiences";
import {
  COMPANY_IDENTITY,
  SITE_TRUST,
  getHubLanding,
  sectionLabel,
} from "@/data/first-viewport";
import {
  breadcrumbsFor,
  getSectionLeaves,
  navigation,
  type NavLeaf,
} from "@/data/navigation";

export function SectionHubPage({
  sectionId,
  title,
  summary,
}: {
  sectionId: string;
  title: string;
  summary: string;
}) {
  const section = navigation.find((n) => n.id === sectionId);
  const leaves = getSectionLeaves(sectionId);
  const crumbs = breadcrumbsFor(`/${sectionId}`);
  const landing = getHubLanding(sectionId);
  const purpose = summary || landing.purpose;
  const label = section?.label ?? sectionLabel(sectionId);

  return (
    <MarketingShell crumbs={crumbs}>
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-surface px-5 py-10 md:mb-14 md:rounded-3xl md:px-10 md:py-14">
        <p
          aria-hidden
          className="pointer-events-none absolute -right-2 top-4 font-deco text-[clamp(4rem,16vw,10rem)] leading-none text-foreground/8"
        >
          {label.slice(0, 6)}
        </p>
        <PurposeChrome
          company={COMPANY_IDENTITY.company}
          craft={COMPANY_IDENTITY.craft}
          context={`Explore · ${label}`}
          title={title}
          promise={purpose}
          outcomes={landing.outcomes}
          trust={SITE_TRUST}
          cta={{ label: landing.ctaLabel, href: landing.ctaHref }}
          accent="#2B6BFF"
          className="relative max-w-3xl"
        />
      </header>

      <div id="explore" className="scroll-mt-28 space-y-10 md:space-y-14">
        {(section?.groups ?? [{ title: "Explore", items: leaves }]).map((group, gi) => (
          <section key={group.title}>
            <p className="mb-3 text-meta text-muted-foreground md:mb-4">
              {group.title}
            </p>
            <div
              className={`grid gap-3 md:gap-4 ${
                gi % 2 === 0
                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {group.items
                .filter((item) => item.href.startsWith(`/${sectionId}`) || sectionId === "work")
                .map((item: NavLeaf, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-transform duration-500 hover:-translate-y-1 md:p-5 ${
                      gi % 2 === 1 && index === 0 ? "sm:col-span-2 sm:min-h-[180px] sm:p-6 md:p-8" : ""
                    }`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(420px 180px at 100% 0%, rgba(43,107,255,0.22), transparent 60%)",
                      }}
                    />
                    <div className="relative min-w-0">
                      <h2 className="font-display text-[22px] leading-tight text-foreground md:text-[26px]">
                        {item.title}
                      </h2>
                      <p className="relative mt-3 line-clamp-3 max-w-md text-[13px] text-muted-foreground">
                        {item.description}
                      </p>
                      <span className="relative mt-5 inline-block text-label text-secondary-foreground group-hover:text-foreground">
                        Learn more →
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </MarketingShell>
  );
}

export function LeafMarketingPage({
  sectionId,
  slug,
}: {
  sectionId: string;
  slug: string;
}) {
  const href = `/${sectionId}/${slug}`;
  const leaves = getSectionLeaves(sectionId);
  const leaf = leaves.find((l) => l.href === href);
  const section = navigation.find((n) => n.id === sectionId);
  const title = leaf?.title ?? slug.replace(/-/g, " ");
  const summary =
    leaf?.description ??
    `Explore ${title} within Satyakabir Technologies — part of our ${section?.label ?? sectionId} practice.`;
  const related = leaves
    .filter((l) => l.href !== href)
    .slice(0, 6)
    .map((l) => ({ title: l.title, href: l.href, description: l.description }));

  const data = buildExperience({
    sectionId,
    slug,
    title,
    summary,
    related,
  });

  return <ExperiencePage data={data} />;
}
