/**
 * Public Next.js Website API Client for Headless CMS
 * Connects website/ to backend Express API server
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:15000";

export interface CmsBlock {
  id: string;
  type: string;
  order: number;
  data: Record<string, any>;
}

export interface CmsPageData {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  publishedAt?: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  blocks: CmsBlock[];
  revisionNumber?: number;
  redirect?: boolean;
  toPath?: string;
  statusCode?: number;
}

export interface CmsThemeData {
  primaryFont?: string;
  headingFont?: string;
  primaryColor?: string;
  accentColor?: string;
  mode?: string;
  borderRadius?: string;
  customCss?: string;
  analyticsId?: string;
  tagManagerId?: string;
}

export interface CmsNavigationData {
  brandName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  headerMenu: any[];
  footerMenu: any[];
  socialLinks: Record<string, string>;
  seoDefaults: Record<string, string>;
  theme: CmsThemeData;
}

export async function fetchCmsPageBySlug(slug: string, previewToken?: string): Promise<CmsPageData | null> {
  try {
    const encodedSlug = encodeURIComponent(slug.startsWith("/") ? slug : `/${slug}`);
    const tokenQuery = previewToken ? `&previewToken=${encodeURIComponent(previewToken)}` : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/website/pages/by-slug?slug=${encodedSlug}${tokenQuery}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`CMS Page fetch error ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("[CMS API] Error fetching page by slug:", err);
    return null;
  }
}

export async function fetchCmsNavigation(): Promise<CmsNavigationData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/website/navigation`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[CMS API] Error fetching navigation:", err);
    return null;
  }
}

export async function fetchCmsSitemapSlugs(): Promise<Array<{ slug: string; lastModified: string; pageType: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/website/sitemap`, {
      next: { revalidate: 600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.pages || [];
  } catch (err) {
    console.error("[CMS API] Error fetching sitemap slugs:", err);
    return [];
  }
}

export async function submitCmsInquiry(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  projectType?: string;
  budget?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/website/inquire`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Inquiry submission failed");
  }
  return await res.json();
}

export async function submitCmsJobApplication(data: {
  name: string;
  email: string;
  phone?: string;
  jobSlug: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  coverLetter?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/website/careers/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Job application submission failed");
  }
  return await res.json();
}
