import { customFetch } from "./custom-fetch";

export interface WebsitePage {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  pageType: "landing" | "service" | "career" | "legal" | "blog" | "standard";
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";
  version: number;
  publishedRevisionId?: any;
  publishedAt?: string;
  scheduledPublishAt?: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  draftBlocks: Array<{
    id: string;
    type: string;
    order: number;
    data: Record<string, any>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteMediaItem {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  key: string;
  altText?: string;
  createdAt: string;
}

export interface WebsiteRedirectRule {
  _id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  createdAt: string;
}

export interface WebsiteThemeConfig {
  primaryFont: string;
  headingFont: string;
  primaryColor: string;
  accentColor: string;
  mode: "dark" | "light" | "system";
  borderRadius: string;
  customCss?: string;
  analyticsId?: string;
  tagManagerId?: string;
}

export interface WebsiteSettingsData {
  brandName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  headerMenu: any[];
  footerMenu: any[];
  socialLinks: Record<string, string>;
  seoDefaults: Record<string, string>;
  theme: WebsiteThemeConfig;
}

// ----------------------------------------------------
// API Functions
// ----------------------------------------------------

export async function fetchAdminPages(params?: { status?: string; search?: string; limit?: number; page?: number }) {
  const query = new URLSearchParams(params as any).toString();
  return customFetch<{ pages: WebsitePage[]; total: number }>(`/api/v1/admin/website/pages${query ? `?${query}` : ""}`);
}

export async function createAdminPage(data: Partial<WebsitePage>): Promise<WebsitePage> {
  return customFetch<WebsitePage>("/api/v1/admin/website/pages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function seedDefaultPagesApi(): Promise<{ message: string; seededCount: number }> {
  return customFetch<{ message: string; seededCount: number }>("/api/v1/admin/website/pages/seed-default", {
    method: "POST",
  });
}

export async function fetchAdminPageById(id: string) {
  return customFetch<WebsitePage>(`/api/v1/admin/website/pages/${id}`);
}

export async function updateAdminPageDraft(id: string, data: Partial<WebsitePage> & { version: number }) {
  return customFetch<WebsitePage>(`/api/v1/admin/website/pages/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminPage(id: string) {
  return customFetch<{ success: boolean }>(`/api/v1/admin/website/pages/${id}`, {
    method: "DELETE",
  });
}

export async function publishAdminPage(id: string) {
  return customFetch<{ success: boolean; page: WebsitePage }>(`/api/v1/admin/website/pages/${id}/publish`, {
    method: "POST",
  });
}

export async function rollbackAdminPage(id: string, revisionId: string) {
  return customFetch<{ success: boolean; page: WebsitePage }>(`/api/v1/admin/website/pages/${id}/rollback`, {
    method: "POST",
    body: JSON.stringify({ revisionId }),
  });
}

export async function generatePreviewToken(id: string) {
  return customFetch<{ token: string; expiresAt: number; slug: string }>(`/api/v1/admin/website/pages/${id}/preview-token`, {
    method: "POST",
  });
}

export async function requestPresignedMediaUrl(data: { fileName: string; fileType: string; fileSize: number }) {
  return customFetch<{ uploadUrl: string; key: string; url: string }>("/api/v1/admin/website/media/presigned-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function confirmMediaUpload(data: { key: string; originalName: string; mimetype: string; category?: string; altText?: string }) {
  return customFetch<WebsiteMediaItem>("/api/v1/admin/website/media/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchAdminMedia(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams(params as any).toString();
  return customFetch<{ items: WebsiteMediaItem[]; total: number }>(`/api/v1/admin/website/media${query ? `?${query}` : ""}`);
}

export async function deleteAdminMedia(id: string) {
  return customFetch<{ success: boolean }>(`/api/v1/admin/website/media/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminRedirects() {
  return customFetch<WebsiteRedirectRule[]>("/api/v1/admin/website/redirects");
}

export async function createAdminRedirect(data: { fromPath: string; toPath: string; statusCode?: number }) {
  return customFetch<WebsiteRedirectRule>("/api/v1/admin/website/redirects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminRedirect(id: string) {
  return customFetch<{ success: boolean }>(`/api/v1/admin/website/redirects/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminSettings() {
  return customFetch<WebsiteSettingsData>("/api/v1/admin/website/settings");
}

export async function updateAdminSettings(data: Partial<WebsiteSettingsData>) {
  return customFetch<WebsiteSettingsData>("/api/v1/admin/website/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function fetchAdminOutbox() {
  return customFetch<{ items: any[]; total: number }>("/api/v1/admin/website/outbox");
}
