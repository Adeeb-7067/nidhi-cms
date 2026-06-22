import { setBaseUrl } from "@/api";

const API_PATH_PREFIX = "/api";

/**
 * API origin from `VITE_API_BASE_URL` in `frontend/.env` only (host, no `/api` suffix).
 * Production (separate domains): set to your API host, e.g. https://api.yourdomain.com
 * When unset, requests stay relative (same origin) and Vite dev proxy forwards `/api`.
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
