import type { Metadata } from "next";
import { site } from "@/data/mock";
import { flattenNavigation, getSectionLeaves, navigation } from "@/data/navigation";

/** Production origin — override with NEXT_PUBLIC_SITE_URL when deploying. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://satyakabir.org"
).trim();

export const SITE_NAME = site.brand;
export const DEFAULT_TITLE =
  "Nidhi Info Tech — AI, Cloud & Product Engineering";
export const DEFAULT_DESCRIPTION =
  "Nidhi Info Tech builds AI-first platforms, cloud estates, and product software — principal-led engineering for ambitious organizations worldwide.";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/og-default.jpg`;
export const SITE_LOGO_IMAGE = `${SITE_URL}/brand/sk-icon-512.png`;

/** Site-wide favicon / PWA icons — included on every page metadata object. */
export const SITE_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon.svg", type: "image/svg+xml" },
    { url: "/brand/sk-icon-192.png", type: "image/png", sizes: "192x192" },
  ],
  shortcut: ["/favicon.ico"],
  apple: [{ url: "/brand/sk-icon-192.png", sizes: "180x180", type: "image/png" }],
};

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateMeta(text: string, max = 155): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

type BuildMetaInput = {
  title: string;
  description: string;
  path: string;
  /** Open Graph type */
  type?: "website" | "article";
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
};

/** Shared Metadata builder for home, hubs, and leaves. */
export function buildPageMetadata({
  title,
  description,
  path,
  type = "website",
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  keywords,
}: BuildMetaInput): Metadata {
  const url = absoluteUrl(path);
  const desc = truncateMeta(description);
  const brandSuffix = ` — ${SITE_NAME}`;
  const fullTitle = /nidhi info tech/i.test(title)
    ? title
    : `${title}${brandSuffix}`;

  return {
    title: { absolute: fullTitle },
    description: desc,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical: path === "/" ? "/" : path },
    icons: SITE_ICONS,
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
      type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images: [image],
    },
  };
}

const HUB_SEO: Record<
  string,
  { title: string; description: string; keywords?: string[] }
> = {
  company: {
    title: "Company",
    description:
      "About Nidhi Info Tech — mission, leadership, culture, infrastructure, partners, and global delivery.",
    keywords: ["Nidhi Info Tech", "about", "engineering culture", "software solutions"],
  },
  services: {
    title: "Services",
    description:
      "AI development, cloud engineering, product engineering, DevOps, security, and digital transformation services from Nidhi Info Tech.",
    keywords: ["AI development", "cloud engineering", "product engineering", "DevOps"],
  },
  solutions: {
    title: "Solutions",
    description:
      "Industry and product solutions — ERP, CRM, healthcare, finance, retail, government, startups, and enterprise platforms.",
    keywords: ["ERP", "CRM", "healthcare software", "enterprise solutions"],
  },
  technologies: {
    title: "Technologies",
    description:
      "Technology practices across React, Next.js, Node, Python, AWS, Azure, OpenAI, and modern data platforms.",
    keywords: ["React", "Next.js", "AWS", "Python", "OpenAI"],
  },
  industries: {
    title: "Industries",
    description:
      "Industry engineering for healthcare, finance, retail, manufacturing, logistics, education, government, and more.",
    keywords: ["healthcare IT", "FinTech", "manufacturing software", "public sector"],
  },
  work: {
    title: "Work",
    description:
      "Featured projects, case studies, portfolio, open source, and client success stories from Nidhi Info Tech.",
    keywords: ["case studies", "portfolio", "client success"],
  },
  insights: {
    title: "Insights",
    description:
      "Blog, research, whitepapers, news, events, and FAQs from Nidhi Info Tech practitioners.",
    keywords: ["engineering blog", "AI research", "whitepapers"],
  },
  careers: {
    title: "Careers",
    description:
      "Join Nidhi Info Tech — open roles, internships, benefits, hiring process, and craft culture for engineers and designers.",
    keywords: ["engineering jobs", "AI jobs", "internships", "developer careers"],
  },
  contact: {
    title: "Contact",
    description:
      "Contact Nidhi Info Tech — book a meeting, get a quote, support, and office locations.",
    keywords: ["contact", "get quote", "book meeting", "office"],
  },
};

export function hubMetadata(sectionId: string): Metadata {
  const hub = HUB_SEO[sectionId];
  const section = navigation.find((n) => n.id === sectionId);
  const title = hub?.title ?? section?.label ?? sectionId;
  const description =
    hub?.description ??
    `Explore ${title} at Nidhi Info Tech — AI-first engineering.`;
  return buildPageMetadata({
    title,
    description,
    path: `/${sectionId}`,
    keywords: hub?.keywords,
  });
}

export function homeMetadata(): Metadata {
  return buildPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    keywords: [
      "Satyakabir Technologies",
      "AI engineering",
      "cloud platforms",
      "product engineering",
      "Bengaluru",
      "software company",
    ],
  });
}

/** Absolute paths for sitemap generation. */
export function allIndexablePaths(): string[] {
  const paths = new Set<string>(["/"]);
  for (const section of navigation) {
    paths.add(`/${section.id}`);
    for (const leaf of getSectionLeaves(section.id)) {
      paths.add(leaf.href);
    }
  }
  // Defensive: anything else in flattenNavigation
  for (const item of flattenNavigation()) {
    if (item.href.startsWith("/")) paths.add(item.href);
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: site.brandShort,
    url: SITE_URL,
    logo: SITE_LOGO_IMAGE,
    email: site.email,
    telephone: site.phone,
    description: DEFAULT_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bengaluru",
      addressCountry: "IN",
    },
    sameAs: [
      // Add official profiles when published
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: site.email,
        availableLanguage: ["English"],
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: SITE_LOGO_IMAGE },
    inLanguage: "en",
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
