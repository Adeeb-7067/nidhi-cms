import { toast } from "sonner";
import type { ApiError } from "@/api";
import { isUploadError } from "@/lib/upload-file";

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

/** Human-readable labels for API `field` keys (used in conflict / validation toasts). */
export const API_FIELD_LABELS: Record<string, string> = {
  email: "Contact email",
  portalEmail: "Portal login email",
  password: "Portal password",
  companyName: "Company name",
  companyCode: "Company code",
  phone: "Phone number",
  gstin: "GSTIN",
  gstNumber: "GSTIN",
  contactPerson: "Contact person",
  file: "File",
  fileUrl: "Build file",
};

export type ParsedApiError = {
  message: string;
  field?: string;
  code?: string;
  status?: number;
};

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

export function apiFieldLabel(field: string): string {
  return (
    API_FIELD_LABELS[field] ??
    field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

function enrichMessageWithField(payload: ErrorPayload | undefined, message: string): string {
  if (!payload?.field) return message;
  const label = apiFieldLabel(payload.field);
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes(label.toLowerCase()) ||
    lowerMsg.includes(payload.field.toLowerCase())
  ) {
    return message;
  }
  return `${label}: ${message}`;
}

function conflictHintForField(field: string): string {
  const label = apiFieldLabel(field);
  return `${label} is already in use. Choose a different value or open the existing record.`;
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

  return (
    p.error?.trim() ||
    p.message?.trim() ||
    (Array.isArray(p.errors) && p.errors.length
      ? typeof p.errors[0] === "string"
        ? p.errors[0].trim()
        : p.errors[0]?.message?.trim()
      : undefined) ||
    (p.details ? firstDetailMessage(p.details) : undefined)
  );
}

function statusHint(status: number, fallback: string, payload?: ErrorPayload): string {
  if (status === 409 && payload?.field) {
    return conflictHintForField(payload.field);
  }
  return STATUS_HINTS[status] ?? fallback;
}

function stripHttpErrorPrefix(message: string): string {
  const match = message.match(/^HTTP \d{3}(?: [^:]*)?:\s*(.+)$/s);
  return match?.[1]?.trim() || message;
}

function isApiLikeError(error: unknown): error is { status: number; data?: unknown; statusText?: string } {
  return isRecord(error) && typeof error.status === "number";
}

function errorPayload(error: unknown): ErrorPayload | undefined {
  if (!isApiLikeError(error) || !isRecord(error.data)) return undefined;
  return error.data as ErrorPayload;
}

/** Structured API error for toasts and inline form field messages. */
export function parseApiError(error: unknown, fallback = DEFAULT_API_ERROR): ParsedApiError {
  if (isUploadError(error)) {
    return {
      message: error.message,
      field: error.field,
      code: error.code,
      status: error.status,
    };
  }

  if (isApiLikeError(error)) {
    const payload = errorPayload(error);
    let message =
      payloadMessage(error.data) ??
      (error instanceof Error && error.message
        ? stripHttpErrorPrefix(error.message.trim())
        : undefined);

    if (!message || message.startsWith("HTTP ")) {
      message = statusHint(error.status, fallback, payload);
    } else {
      message = enrichMessageWithField(payload, message);
    }

    return {
      message,
      field: payload?.field,
      code: payload?.code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    if (error.name === "ResponseParseError") {
      return { message: fallback };
    }
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return {
        message: "Cannot reach the server. Check that the API is running and refresh the page.",
      };
    }
    const trimmed = stripHttpErrorPrefix(error.message.trim());
    if (trimmed && !trimmed.startsWith("HTTP ")) {
      return { message: trimmed };
    }
  }

  return { message: fallback };
}

/** User-facing message from API errors, network failures, or generic Error. */
export function getApiErrorMessage(error: unknown, fallback = DEFAULT_API_ERROR): string {
  return parseApiError(error, fallback).message;
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

/** Parse an upload failure and show a toast; returns structured error for form fields. */
export function toastUploadError(error: unknown, fallback = "Failed to upload file."): ParsedApiError {
  const parsed = parseApiError(error, fallback);
  toast.error(parsed.message);
  return parsed;
}

/** Type guard for ApiError from customFetch. */
export function isApiError(error: unknown): error is ApiError {
  return isRecord(error) && error.name === "ApiError" && typeof error.status === "number";
}
