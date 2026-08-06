/**
 * Universal First Impression System — site-wide first-viewport contract.
 *
 * Every marketing surface answers in 3–5 seconds (no scroll):
 * Who → Where → What → Why care → What next.
 */

export type TrustMetric = { value: string; label: string };

export type FirstViewportIdentity = {
  company: string;
  craft: string;
};

export const COMPANY_IDENTITY: FirstViewportIdentity = {
  company: "Satyakabir Technologies",
  craft: "Technology engineering · Digital transformation",
};

/** Site-wide proof strip — visible before scroll on hubs and leaves. */
export const SITE_TRUST: TrustMetric[] = [
  { value: "250+", label: "Projects delivered" },
  { value: "120+", label: "Businesses transformed" },
  { value: "18", label: "Industries" },
  { value: "9", label: "Countries" },
];

const SECTION_LABELS: Record<string, string> = {
  company: "Company",
  services: "Services",
  solutions: "Solutions",
  technologies: "Technologies",
  industries: "Industries",
  work: "Work",
  insights: "Insights",
  careers: "Careers",
  contact: "Contact",
};

const SECTION_OUTCOMES: Record<string, string[]> = {
  company: [
    "Meet the people behind the platforms",
    "Understand how we deliver",
    "See where we operate",
  ],
  services: [
    "Ship production systems faster",
    "Reduce operational cost and risk",
    "Scale with principal-led craft",
  ],
  solutions: [
    "Solve a business outcome, not a feature list",
    "Reuse proven platform patterns",
    "Go live with operators ready",
  ],
  technologies: [
    "Choose stacks that survive production",
    "Avoid rewrite traps",
    "Match tools to business constraints",
  ],
  industries: [
    "Domain fluency from day one",
    "Compliance without freezing delivery",
    "Systems operators actually trust",
  ],
  work: [
    "See architecture and outcomes, not slides",
    "Judge craft by production proof",
    "Find a pattern for your next build",
  ],
  insights: [
    "Learn from practitioners who still ship",
    "Apply patterns to real constraints",
    "Skip generic thought-leadership filler",
  ],
  careers: [
    "Work on systems that reach production",
    "Grow with principals, not ticket queues",
    "Join a craft-first engineering culture",
  ],
  contact: [
    "Talk to a principal, not a form bot",
    "Leave with a scoped next step",
    "Start in days, not months of theatre",
  ],
};

export type HubLandingCopy = {
  purpose: string;
  outcomes: string[];
  ctaLabel: string;
  /** In-page explore hash or contact path */
  ctaHref: string;
};

export const HUB_LANDINGS: Record<string, HubLandingCopy> = {
  company: {
    purpose:
      "The people, principles, and presence behind Satyakabir — so you know who builds with you.",
    outcomes: SECTION_OUTCOMES.company,
    ctaLabel: "Talk with us",
    ctaHref: "/contact/book-meeting",
  },
  services: {
    purpose:
      "Build digital products, AI platforms, and enterprise software engineered for growth.",
    outcomes: SECTION_OUTCOMES.services,
    ctaLabel: "Start a project",
    ctaHref: "/contact/get-quote",
  },
  solutions: {
    purpose:
      "Outcome-shaped platforms across ERP, CRM, industry verticals, startups, and enterprise programs.",
    outcomes: SECTION_OUTCOMES.solutions,
    ctaLabel: "Request a quote",
    ctaHref: "/contact/get-quote",
  },
  technologies: {
    purpose:
      "The primitives we ship with — frontend, backend, cloud, AI, data, and mobile — chosen for production, not fashion.",
    outcomes: SECTION_OUTCOMES.technologies,
    ctaLabel: "Discuss your stack",
    ctaHref: "/contact/book-meeting",
  },
  industries: {
    purpose:
      "Domain-fluent engineering for regulated and high-growth markets — healthcare, finance, retail, and more.",
    outcomes: SECTION_OUTCOMES.industries,
    ctaLabel: "Talk industry fit",
    ctaHref: "/contact/book-meeting",
  },
  work: {
    purpose:
      "Selected builds and case studies — architecture, delivery, and outcomes you can evaluate.",
    outcomes: SECTION_OUTCOMES.work,
    ctaLabel: "Start a project",
    ctaHref: "/contact/get-quote",
  },
  insights: {
    purpose:
      "Writing and research from practitioners who still ship — patterns you can use on your next system.",
    outcomes: SECTION_OUTCOMES.insights,
    ctaLabel: "Get in touch",
    ctaHref: "/contact/contact-us",
  },
  careers: {
    purpose:
      "Join a craft-first engineering culture — roles, internships, benefits, and how we hire.",
    outcomes: SECTION_OUTCOMES.careers,
    ctaLabel: "See Open Roles",
    ctaHref: "/careers/open-positions",
  },
  contact: {
    purpose:
      "Talk with a principal, book a meeting, request a quote, or find our offices.",
    outcomes: SECTION_OUTCOMES.contact,
    ctaLabel: "Contact Us",
    ctaHref: "/contact/contact-us",
  },
};

export function sectionLabel(sectionId: string): string {
  return SECTION_LABELS[sectionId] ?? sectionId.replace(/-/g, " ");
}

/** Visitor-facing page context — never internal kind strings. */
export function pageContext(sectionId: string, title: string): string {
  const section = sectionLabel(sectionId);
  if (!title || title.toLowerCase() === section.toLowerCase()) return section;
  return `${section} · ${title}`;
}

export function defaultOutcomes(sectionId: string): string[] {
  return SECTION_OUTCOMES[sectionId] ?? [
    "Ship with confidence",
    "Reduce delivery risk",
    "Own the system long-term",
  ];
}

export function defaultTrust(metrics?: TrustMetric[]): TrustMetric[] {
  if (metrics?.length) return metrics.slice(0, 4);
  return SITE_TRUST;
}

export function getHubLanding(sectionId: string): HubLandingCopy {
  return (
    HUB_LANDINGS[sectionId] ?? {
      purpose: `Explore ${sectionLabel(sectionId)} from Satyakabir Technologies.`,
      outcomes: defaultOutcomes(sectionId),
      ctaLabel: `Explore ${sectionLabel(sectionId)}`,
      ctaHref: "#explore",
    }
  );
}

/** Homepage arrival one-line offer — must state what the site is for. */
export const HOME_ARRIVAL_OFFER =
  "We build AI, cloud, and enterprise software that helps businesses scale.";
