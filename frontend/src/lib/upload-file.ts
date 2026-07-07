import { apiUrl, getApiBaseUrl } from "@/lib/api-base";
import type { UploadCategory } from "@/components/ui/file-uploader";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const CATEGORY_MAX_MB: Record<string, number> = {
  apk: 500,
  avatars: 5,
  bugs: 50,
  inventory: 50,
  reports: 50,
  misc: 50,
  hrm: 10,
};

export class UploadError extends Error {
  readonly name = "UploadError";
  readonly status: number;
  readonly code?: string;
  readonly field?: string;

  constructor(
    message: string,
    options?: { status?: number; code?: string; field?: string },
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = options?.status ?? 0;
    this.code = options?.code;
    this.field = options?.field;
  }
}

export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError;
}

/**
 * Prefer same-origin `/api/upload` in local dev so Vite proxies large APK bodies
 * instead of cross-origin POSTs to localhost:8080 (CORS / connection drops).
 */
export function resolveUploadRequestUrl(category: UploadCategory | string): string {
  const path = `/api/upload?category=${encodeURIComponent(category)}`;
  const apiBase = getApiBaseUrl();
  if (!apiBase || typeof window === "undefined") {
    return apiBase ? apiUrl(path) : path;
  }
  try {
    const api = new URL(apiBase);
    const pageHost = window.location.hostname;
    if (LOCAL_HOSTS.has(api.hostname) && LOCAL_HOSTS.has(pageHost)) {
      return path;
    }
    if (api.origin === window.location.origin) {
      return path;
    }
  } catch {
    // fall through to absolute API URL
  }
  return apiUrl(path);
}

export type FileUploadResponse = {
  url: string;
  publicUrl?: string;
  originalName?: string;
  mimetype?: string;
};

function maxMbForCategory(category: UploadCategory | string): number {
  return CATEGORY_MAX_MB[category] ?? 50;
}

function parseUploadFailure(
  xhr: XMLHttpRequest,
  category: UploadCategory | string,
): UploadError {
  const status = xhr.status;
  const maxMb = maxMbForCategory(category);

  if (status === 0) {
    return new UploadError(
      category === "apk"
        ? "Could not reach the server while uploading the APK. Check your connection, restart the API if needed, and ensure nginx/proxy allows large uploads (client_max_body_size)."
        : "Could not reach the server. Check your connection and try again.",
      { status: 0, code: "NETWORK_ERROR", field: "file" },
    );
  }

  if (status === 401) {
    return new UploadError("Your session expired. Sign in again and retry the upload.", {
      status: 401,
      code: "UNAUTHORIZED",
      field: "file",
    });
  }

  if (status === 403) {
    return new UploadError("You do not have permission to upload files.", {
      status: 403,
      code: "FORBIDDEN",
      field: "file",
    });
  }

  if (status === 413) {
    return new UploadError(`File is too large. Maximum allowed is ${maxMb} MB.`, {
      status: 413,
      code: "UPLOAD_ERROR",
      field: "file",
    });
  }

  const text = xhr.responseText?.trim() ?? "";
  if (text) {
    try {
      const body = JSON.parse(text) as {
        error?: string;
        message?: string;
        code?: string;
        field?: string;
      };
      const msg = body.error?.trim() || body.message?.trim();
      if (msg) {
        return new UploadError(msg, {
          status,
          code: body.code ?? "UPLOAD_ERROR",
          field: body.field ?? "file",
        });
      }
    } catch {
      const lower = text.toLowerCase();
      if (
        lower.includes("request entity too large") ||
        lower.includes("payload too large") ||
        lower.includes("413")
      ) {
        return new UploadError(
          `File is too large for the server. Ask your admin to raise nginx client_max_body_size (max ${maxMb} MB for this file type).`,
          { status: 413, code: "UPLOAD_ERROR", field: "file" },
        );
      }
      if (lower.includes("bad gateway") || lower.includes("502")) {
        return new UploadError("Upload proxy timed out or rejected the file. Try again or use a smaller build.", {
          status: 502,
          code: "UPLOAD_ERROR",
          field: "file",
        });
      }
    }
  }

  const hints: Record<number, string> = {
    400: "Upload was rejected. Check the file and try again.",
    404: "Upload endpoint not found. The API may be misconfigured.",
    429: "Too many uploads. Wait a moment and try again.",
    500: "The server failed to store the file. Try again or contact support.",
    502: "The server is temporarily unavailable. Try again shortly.",
    503: "The server is busy. Try again in a moment.",
  };

  return new UploadError(hints[status] ?? `Upload failed (HTTP ${status}).`, {
    status,
    code: "UPLOAD_ERROR",
    field: "file",
  });
}

export function uploadFileWithProgress(
  file: File,
  category: UploadCategory | string,
  options?: { onProgress?: (pct: number) => void; timeoutMs?: number },
): Promise<FileUploadResponse> {
  const timeoutMs = options?.timeoutMs ?? (category === "apk" ? 600_000 : 120_000);
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", resolveUploadRequestUrl(category), true);
    xhr.timeout = timeoutMs;

    const token = localStorage.getItem("accessToken");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && options?.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as FileUploadResponse;
          if (!data?.url) {
            reject(
              new UploadError("Server did not return a file URL after upload.", {
                status: xhr.status,
                code: "INVALID_RESPONSE",
                field: "file",
              }),
            );
            return;
          }
          resolve(data);
        } catch {
          reject(
            new UploadError("Server returned an invalid upload response.", {
              status: xhr.status,
              code: "INVALID_RESPONSE",
              field: "file",
            }),
          );
        }
        return;
      }
      reject(parseUploadFailure(xhr, category));
    };

    xhr.onerror = () => reject(parseUploadFailure(xhr, category));
    xhr.ontimeout = () =>
      reject(
        new UploadError(
          `Upload timed out after ${Math.round(timeoutMs / 60_000)} minutes. Try a smaller file or check server/proxy timeouts.`,
          { status: 0, code: "TIMEOUT", field: "file" },
        ),
      );
    xhr.onabort = () =>
      reject(new UploadError("Upload was cancelled.", { status: 0, code: "ABORTED", field: "file" }));

    xhr.send(formData);
  });
}
