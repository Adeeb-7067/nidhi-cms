import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { navigation } from "@/data/navigation";
import { contact, site } from "@/data/mock";

/**
 * Site footer.
 *
 * Columns are derived from `navigation` rather than hand-listed, so the footer
 * cannot drift out of sync with the nav as the IA grows — the previous footer had
 * four links against a nav of ~150 pages.
 */
function sectionLeaves(id: string, limit: number) {
  const item = navigation.find((n) => n.id === id);
  if (!item) return [];
  return (item.groups ?? []).flatMap((group) => group.items).slice(0, limit);
}

/** Top-level destinations that are single pages rather than mega sections. */
const DIRECT_LINKS = [
  { label: "Work", href: "/work" },
  { label: "Insights", href: "/insights" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

/**
 * Only rendered where a real destination exists.
 *
 * `contact.socials` and `contact.legal` currently carry placeholders ("#") and no
 * Privacy/Terms routes are built, and a footer full of links that go nowhere is
 * worse than a footer without them — especially the one place enterprise
 * procurement goes looking for exactly those documents.
 */
const socialLinks = contact.socials.filter((s) => s.href && s.href !== "#");

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { title: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-meta text-foreground">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-small text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const services = sectionLeaves("services", 8);
  const solutions = sectionLeaves("solutions", 7);
  const industries = sectionLeaves("industries", 7);
  const technologies = sectionLeaves("technologies", 18);

  const company = [
    ...sectionLeaves("company", 4),
    ...DIRECT_LINKS.map((l) => ({ title: l.label, href: l.href })),
  ];

  return (
    <footer
      /*
        Raised surface on purpose. `bg-background` put it at #020305 directly
        against the closing CTA's #03060D — the same colour to the eye, so the
        footer read as a continuation of the CTA instead of separate chrome. This
        is the quietest, most structural band on the page and should look like it.
      */
      className="cv-auto relative isolate border-t border-border bg-[color-mix(in_oklab,var(--surface)_55%,var(--background))]"
      style={{ zIndex: "var(--z-content)" }}
    >
      <div className="relative mx-auto w-full max-w-[var(--grid-max)] page-pad">
        {/* Brand + IA */}
        <div className="grid grid-cols-12 gap-x-8 gap-y-12 py-14 md:py-16">
          <div className="col-span-12 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Logo size="sm" />
              <span className="flex flex-col text-left">
                <span className="text-[13px] font-semibold uppercase leading-none tracking-[0.14em] text-foreground">
                  Satyakabir
                </span>
                <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Technologies
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-[42ch] text-small text-secondary-foreground">
              Digital transformation, product engineering, and growth marketing under one
              partner — for companies that cannot afford to guess.
            </p>

            <ul className="mt-7 flex flex-col gap-3">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="group inline-flex items-center gap-2.5 text-small text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 text-brand-cyan" strokeWidth={1.75} />
                  {site.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${site.phone.replace(/\s+/g, "")}`}
                  className="group inline-flex items-center gap-2.5 text-small text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-cyan" strokeWidth={1.75} />
                  {site.phone}
                </a>
              </li>
              <li className="inline-flex items-start gap-2.5 text-small text-muted-foreground">
                <MapPin
                  className="mt-[3px] h-3.5 w-3.5 shrink-0 text-brand-cyan"
                  strokeWidth={1.75}
                />
                {site.location}
              </li>
            </ul>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
              <LinkColumn title="Services" links={services} />
              <LinkColumn title="Solutions" links={solutions} />
              <LinkColumn title="Industries" links={industries} />
              <LinkColumn title="Company" links={company} />
            </div>
          </div>
        </div>

        {/* Technologies read as a wrapped index rather than a fifth column: there
            are 25+ of them, they are short, and they are worth crawling. */}
        <div className="border-t border-divider py-9">
          <h3 className="text-meta text-foreground">Technologies</h3>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5">
            {technologies.map((tech) => (
              <li key={tech.href}>
                <Link
                  href={tech.href}
                  className="text-small text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  {tech.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/technologies"
                className="text-small text-brand-cyan transition-colors duration-300 hover:text-foreground"
              >
                All technologies →
              </Link>
            </li>
          </ul>
        </div>

        {/* Offices */}
        <div className="grid gap-6 border-t border-divider py-9 sm:grid-cols-3">
          {contact.offices.map((office) => (
            <div key={office.city}>
              <p className="text-card-title text-foreground">{office.city}</p>
              <p className="mt-1.5 text-small">{office.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Legal bar */}
      <div className="relative border-t border-border">
        <div className="mx-auto flex w-full max-w-[var(--grid-max)] flex-col gap-3 page-pad py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-meta text-muted-foreground">{site.copyright}</p>
          {socialLinks.length ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-label text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
