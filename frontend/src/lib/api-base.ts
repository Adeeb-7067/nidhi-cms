import { setBaseUrl } from "@/api";

const API_PATH_PREFIX = "/api";

/**
 * API origin from `VITE_API_BASE_URL` (host, no `/api` suffix).
 * Local web: leave unset so requests stay relative (`/api`) and Vite proxies them
 * (same-origin — avoids CORS OPTIONS on every call).
 * Production: prefer reverse-proxying `/api` on the app host; only set an absolute
 * origin when UI and API are intentionally on different domains (or Electron builds).
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
}

/**
 * Base URL for the Orval-generated client (OpenAPI paths omit the `/api` server prefix).
 * - With `VITE_API_BASE_URL`: `http://host:port/api`
 * - Without: `/api` (relative, Vite proxy)
 */
export function getApiClientBaseUrl(): string {
  const origin = getApiBaseUrl();
  if (!origin) return API_PATH_PREFIX;
  return origin.endsWith(API_PATH_PREFIX) ? origin : `${origin}${API_PATH_PREFIX}`;
}

/** Absolute URL for manual `fetch` calls — paths should include `/api/...`. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiBaseUrl();
  return origin ? `${origin}${normalized}` : normalized;
}

/** Call once at app startup so React Query / Orval hooks honor `VITE_API_BASE_URL`. */
export function configureApiClient(): void {
  setBaseUrl(getApiClientBaseUrl());
}
