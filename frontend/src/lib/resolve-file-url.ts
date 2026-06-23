import { apiUrl } from "@/lib/api-base";

/** Resolve stored upload paths to a browser-openable URL. */
export function resolveFileUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return apiUrl(url);
  return apiUrl(`/${url.replace(/^\//, "")}`);
}
