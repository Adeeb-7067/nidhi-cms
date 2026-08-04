import Link from "next/link";
import type { NavLayout, NavLeaf } from "@/data/navigation";
import { ctaNav } from "@/data/navigation";
import { PremiumButton } from "@/components/ui/PremiumButton";

const features = [
  "Architecture reviews with measurable outcomes",
  "Security and reliability gates in every release",
  "Design systems that scale with the product",
  "Principal-led delivery pods",
];

const benefits = [
  { title: "Velocity with control", body: "Ship weekly without sacrificing auditability." },
  { title: "Compounding platforms", body: "Build once — extend across products and markets." },
  { title: "Human-grade UX", body: "Interfaces that feel calm under operational pressure." },
];

export function MarketingPage({
  title,
  eyebrow,
  summary,
  layout,
  related = [],
  sectionHref,
}: {
  title: string;
  eyebrow: string;
  summary: string;
  layout: NavLayout;
  related?: NavLeaf[];
  sectionHref: string;
}) {
  return (
    <div className="pb-16">
      <Hero layout={layout} title={title} eyebrow={eyebrow} summary={summary} />
      <Overview layout={layout} summary={summary} />
      <Features layout={layout} />
      <Benefits layout={layout} />
      {related.length > 0 ? (
        <section className="mt-16">
          <p className="text-eyebrow text-muted-foreground">Related</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-border bg-muted p-4 transition-colors hover:border-border hover:bg-muted"
              >
                <div className="font-display text-[20px] text-foreground">{item.title}</div>
                <p className="mt-2 text-[13px] text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
          <Link
            href={sectionHref}
            className="mt-5 inline-block text-label text-muted-foreground hover:text-foreground"
          >
            View all in section →
          </Link>
        </section>
      ) : null}
      <CtaBand />
    </div>
  );
}

function Hero({
  layout,
  title,
  eyebrow,
  summary,
}: {
  layout: NavLayout;
  title: string;
  eyebrow: string;
  summary: string;
}) {
  if (layout === "manifesto") {
    return (
      <header className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-14 md:px-12 md:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 20% 0%, rgba(255,176,72,0.18), transparent 60%), radial-gradient(500px 280px at 90% 80%, rgba(43,107,255,0.2), transparent 55%)",
          }}
        />
        <p className="relative text-eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="relative mt-4 max-w-4xl font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.92] tracking-[0.02em]">
          {title}
        </h1>
        <p className="relative mt-6 max-w-xl text-[16px] leading-relaxed text-secondary-foreground">{summary}</p>
      </header>
    );
  }

  if (layout === "split") {
    return (
      <header className="grid gap-8 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] tracking-[0.02em]">
            {title}
          </h1>
        </div>
        <p className="max-w-md text-[15px] leading-relaxed text-secondary-foreground lg:justify-self-end">{summary}</p>
      </header>
    );
  }

  if (layout === "stats") {
    return (
      <header className="rounded-[28px] border border-border bg-gradient-to-br from-[#0a1020] to-[#070A10] p-6 md:p-10">
        <p className="text-eyebrow text-brand-cyan/80">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.95]">{title}</h1>
        <p className="mt-4 max-w-2xl text-[15px] text-secondary-foreground">{summary}</p>
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
          {[
            ["99.9%", "Uptime bar"],
            ["50+", "Products"],
            ["12+", "Countries"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="font-display text-[28px] md:text-[34px]">{v}</div>
              <div className="text-meta text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </header>
    );
  }

  return (
    <header className="max-w-3xl">
      <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.95] tracking-[0.02em]">
        {title}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-secondary-foreground">{summary}</p>
    </header>
  );
}

function Overview({ layout, summary }: { layout: NavLayout; summary: string }) {
  if (layout === "editorial") {
    return (
      <section className="mt-14 grid gap-8 border-y border-border py-10 md:grid-cols-[0.4fr_1fr]">
        <p className="font-display text-[22px] uppercase tracking-[0.08em] text-muted-foreground">Overview</p>
        <p className="text-[17px] leading-[1.75] text-secondary-foreground">{summary} This page is part of Satyakabir’s complete digital experience — connected to the cinematic headquarters journey and our delivery practices.</p>
      </section>
    );
  }

  return (
    <section className="mt-12 max-w-2xl">
      <p className="text-eyebrow text-muted-foreground">Overview</p>
      <p className="mt-3 text-[15px] leading-relaxed text-secondary-foreground">
        {summary} Placeholder content will be replaced with production copy, diagrams, and case proofs as each practice area is published.
      </p>
    </section>
  );
}

function Features({ layout }: { layout: NavLayout }) {
  if (layout === "grid" || layout === "timeline") {
    return (
      <section className="mt-14">
        <p className="text-eyebrow text-muted-foreground">Features</p>
        <div className={`mt-5 grid gap-3 ${layout === "timeline" ? "md:grid-cols-1" : "sm:grid-cols-2"}`}>
          {features.map((f, i) => (
            <div
              key={f}
              className="flex gap-4 rounded-2xl border border-border bg-muted p-4 md:p-5"
            >
              <span className="text-meta text-brand-orange/80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-[14px] text-secondary-foreground">{f}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <p className="text-eyebrow text-muted-foreground">Features</p>
      <ul className="mt-4 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-[14px] text-secondary-foreground">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-cyan" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Benefits({ layout }: { layout: NavLayout }) {
  return (
    <section className={`mt-14 ${layout === "split" ? "grid gap-4 md:grid-cols-3" : "space-y-4"}`}>
      <p className={`text-eyebrow text-muted-foreground ${layout === "split" ? "md:col-span-3" : ""}`}>
        Benefits
      </p>
      {benefits.map((b) => (
        <div key={b.title} className="rounded-2xl border border-border p-5">
          <h3 className="font-display text-[24px] tracking-[0.02em]">{b.title}</h3>
          <p className="mt-2 text-[13px] text-muted-foreground">{b.body}</p>
        </div>
      ))}
    </section>
  );
}

function CtaBand() {
  return (
    <section className="mt-16 overflow-hidden rounded-[28px] border border-border bg-surface p-6 md:p-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-eyebrow text-muted-foreground">Next step</p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.2rem)] leading-none tracking-[0.02em]">
            Ready to build?
          </h2>
          <p className="mt-3 max-w-md text-[14px] text-muted-foreground">
            Tell us about the platform, product, or transformation on your horizon.
          </p>
        </div>
        <Link href={ctaNav.href}>
          <PremiumButton>{ctaNav.label}</PremiumButton>
        </Link>
      </div>
    </section>
  );
}
