import { setBaseUrl } from "@/api";

/**
 * API origin from `VITE_API_BASE_URL` in `frontend/.env` only.
 * Production (separate domains): set to your API host, e.g. https://api.yourdomain.com
 * When unset, requests stay relative (same origin) and Vite dev proxy forwards to the API.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
}

/** Absolute URL for manual `fetch` calls — same rules as the generated API client. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

/** Call once at app startup so React Query / Orval hooks honor `VITE_API_BASE_URL`. */
export function configureApiClient(): void {
  const base = getApiBaseUrl();
  setBaseUrl(base || null);
}
