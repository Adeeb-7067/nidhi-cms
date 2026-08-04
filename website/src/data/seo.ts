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
  "Satyakabir Technologies — AI, Cloud & Product Engineering";
export const DEFAULT_DESCRIPTION =
  "Satyakabir Technologies builds AI-first platforms, cloud estates, and product software from Bengaluru — principal-led engineering for ambitious organizations worldwide.";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/sk-logo.png`;

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
  const fullTitle = /satyakabir technologies/i.test(title)
    ? title
    : `${title}${brandSuffix}`;

  return {
    title: { absolute: fullTitle },
    description: desc,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical: path === "/" ? "/" : path },
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
          width: 512,
          height: 512,
          alt: `${SITE_NAME} logo`,
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
      "About Satyakabir Technologies — mission, leadership, culture, infrastructure, partners, and global delivery from Bengaluru.",
    keywords: ["Satyakabir", "about", "AI company Bengaluru", "engineering culture"],
  },
  services: {
    title: "Services",
    description:
      "AI development, cloud engineering, product engineering, DevOps, security, and digital transformation services from Satyakabir.",
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
      "Featured projects, case studies, portfolio, open source, and client success stories from Satyakabir Technologies.",
    keywords: ["case studies", "portfolio", "client success"],
  },
  insights: {
    title: "Insights",
    description:
      "Blog, research, whitepapers, news, events, and FAQs from Satyakabir practitioners.",
    keywords: ["engineering blog", "AI research", "whitepapers"],
  },
  careers: {
    title: "Careers",
    description:
      "Join Satyakabir — open roles, internships, benefits, hiring process, and craft culture for engineers and designers.",
    keywords: ["engineering jobs", "Bengaluru careers", "AI jobs", "internships"],
  },
  contact: {
    title: "Contact",
    description:
      "Contact Satyakabir Technologies — book a meeting, get a quote, support, and office locations.",
    keywords: ["contact", "get quote", "book meeting", "Bengaluru office"],
  },
};

export function hubMetadata(sectionId: string): Metadata {
  const hub = HUB_SEO[sectionId];
  const section = navigation.find((n) => n.id === sectionId);
  const title = hub?.title ?? section?.label ?? sectionId;
  const description =
    hub?.description ??
    `Explore ${title} at Satyakabir Technologies — AI-first engineering from Bengaluru.`;
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
    logo: DEFAULT_OG_IMAGE,
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
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: DEFAULT_OG_IMAGE },
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
