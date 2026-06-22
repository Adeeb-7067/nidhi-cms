import { toast } from "sonner";
import type { ApiError } from "@/api";

type ErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  field?: string;
  details?: Record<string, string[]>;
  errors?: Array<string | { message?: string }>;
  success?: boolean;
};

export const DEFAULT_API_ERROR = "Something went wrong. Please try again.";

const STATUS_HINTS: Record<number, string> = {
  400: "Check your input and try again.",
  401: "Your session expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "That item was not found. It may have been removed.",
  409: "This conflicts with existing data. Change the value and retry.",
  413: "The file is too large.",
  422: "Some fields are invalid. Review the form and try again.",
  429: "Too many requests. Wait a moment and try again.",
  500: DEFAULT_API_ERROR,
  502: "The server is temporarily unavailable. Try again shortly.",
  503: "The server is busy. Try again in a moment.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstDetailMessage(details: Record<string, string[]>): string | undefined {
  for (const messages of Object.values(details)) {
    const msg = messages?.[0]?.trim();
    if (msg) return msg;
  }
  return undefined;
}

/** Extract a user-facing message from an API error JSON body or plain text. */
export function payloadMessage(data: unknown): string | undefined {
  if (typeof data === "string") {
    const trimmed = data.trim();
    return trimmed || undefined;
  }
  if (!isRecord(data)) return undefined;

  const p = data as ErrorPayload;

  if (p.success === false && p.message?.trim()) {
    return p.message.trim();
  }

  const msg =
    p.error?.trim() ||
    p.message?.trim() ||
    (Array.isArray(p.errors) && p.errors.length
      ? typeof p.errors[0] === "string"
        ? p.errors[0].trim()
        : p.errors[0]?.message?.trim()
      : undefined) ||
    (p.details ? firstDetailMessage(p.details) : undefined);

  if (!msg) return undefined;

  if (p.field && !msg.toLowerCase().includes(String(p.field).toLowerCase())) {
    return `${msg} (${p.field})`;
  }
  return msg;
}

function statusHint(status: number, fallback: string): string {
  return STATUS_HINTS[status] ?? fallback;
}

function stripHttpErrorPrefix(message: string): string {
  const match = message.match(/^HTTP \d{3}(?: [^:]*)?:\s*(.+)$/s);
  return match?.[1]?.trim() || message;
}

function isApiLikeError(error: unknown): error is { status: number; data?: unknown; statusText?: string } {
  return isRecord(error) && typeof error.status === "number";
}

/** User-facing message from API errors, network failures, or generic Error. */
export function getApiErrorMessage(error: unknown, fallback = DEFAULT_API_ERROR): string {
  if (isApiLikeError(error)) {
    const fromBody = payloadMessage(error.data);
    if (fromBody) return fromBody;
    return statusHint(error.status, fallback);
  }

  if (error instanceof Error) {
    if (error.name === "ResponseParseError") {
      return fallback;
    }
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return "Cannot reach the server. Check that the API is running and refresh the page.";
    }
    const trimmed = stripHttpErrorPrefix(error.message.trim());
    if (trimmed && !trimmed.startsWith("HTTP ")) return trimmed;
  }

  return fallback;
}

/** Parse a non-ok fetch Response into a friendly message (for raw fetch calls). */
export async function getResponseErrorMessage(
  response: Response,
  fallback = DEFAULT_API_ERROR,
): Promise<string> {
  let data: unknown = null;
  try {
    const text = await response.text();
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  } catch {
    // ignore body read failures
  }
  return getApiErrorMessage({ status: response.status, statusText: response.statusText, data }, fallback);
}

/** Show a Sonner toast with a friendly API error message. */
export function toastApiError(error: unknown, fallback = DEFAULT_API_ERROR): void {
  toast.error(getApiErrorMessage(error, fallback));
}

/** Type guard for ApiError from customFetch. */
export function isApiError(error: unknown): error is ApiError {
  return isRecord(error) && error.name === "ApiError" && typeof error.status === "number";
}
