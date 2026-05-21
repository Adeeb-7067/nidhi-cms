import { toast } from "sonner";
import type { ApiError } from "@workspace/api-client-react";

type ErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  field?: string;
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

function payloadMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const p = data as ErrorPayload;
  const msg = p.error?.trim() || p.message?.trim();
  if (!msg) return undefined;
  if (p.field && !msg.toLowerCase().includes(p.field.toLowerCase())) {
    return `${msg} (${p.field})`;
  }
  return msg;
}

/** User-facing message from API errors, network failures, or generic Error. */
export function getApiErrorMessage(error: unknown, fallback = DEFAULT_API_ERROR): string {
  if (error && typeof error === "object" && "status" in error) {
    const apiErr = error as ApiError<ErrorPayload>;
    const fromBody = payloadMessage(apiErr.data);
    if (fromBody) return fromBody;
    if (apiErr.status && STATUS_HINTS[apiErr.status]) return STATUS_HINTS[apiErr.status];
    if (apiErr.statusText) return `${fallback} (${apiErr.status} ${apiErr.statusText})`;
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return "Cannot reach the server. Check that the API is running and refresh the page.";
    }
    const trimmed = error.message.trim();
    if (trimmed && !trimmed.startsWith("HTTP ")) return trimmed;
  }

  return fallback;
}

/** Show a Sonner toast with a friendly API error message. */
export function toastApiError(error: unknown, fallback = DEFAULT_API_ERROR): void {
  toast.error(getApiErrorMessage(error, fallback));
}
