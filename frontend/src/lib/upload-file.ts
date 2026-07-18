import { apiUrl, getApiBaseUrl } from "@/lib/api-base";
import type { UploadCategory } from "@/components/ui/file-uploader";

const CATEGORY_MAX_MB: Record<string, number> = {
  apk: 500,
  avatars: 5,
  bugs: 50,
  inventory: 50,
  reports: 50,
  misc: 50,
  hrm: 10,
  marketing: 100,
};

/** Categories that upload directly to object storage (bypassing nginx/Node for the file bytes) when available. */
const DIRECT_UPLOAD_CATEGORIES = new Set(["apk"]);

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
 * Use the same API origin as the rest of the app (`VITE_API_BASE_URL`).
 * When unset, stay on same-origin `/api/...` so the Vite dev proxy (or the
 * production reverse proxy) handles routing.
 */
function resolveApiPath(path: string): string {
  const apiBase = getApiBaseUrl();
  if (apiBase) return apiUrl(path);
  return path;
}

export function resolveUploadRequestUrl(category: UploadCategory | string): string {
  return resolveApiPath(`/api/upload?category=${encodeURIComponent(category)}`);
}

export type FileUploadResponse = {
  url: string;
  publicUrl?: string;
  originalName?: string;
  mimetype?: string;
  key?: string;
  size?: number;
};

function maxMbForCategory(category: UploadCategory | string): number {
  return CATEGORY_MAX_MB[category] ?? 50;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
        ? "Could not reach the server while uploading the APK. In local dev, ensure backend PORT matches frontend VITE_API_BASE_URL (e.g. :15000), restart both servers, then retry. On production, raise nginx client_max_body_size (512m+ for APKs)."
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

/** Classic flow: multipart POST straight through the API (and whatever proxy sits in front of it). */
function uploadClassic(
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

type PresignResponse = { uploadUrl: string; key: string; url: string };

/** PUT the raw file straight to object storage — never touches nginx/Node for the body. */
function putDirectToBucket(
  file: File,
  uploadUrl: string,
  options?: { onProgress?: (pct: number) => void; timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 600_000;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && options?.onProgress) {
        // Cap at 95% — the finalize call still has to confirm + set ACL.
        options.onProgress(Math.round((event.loaded / event.total) * 95));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(
        new UploadError(`Object storage rejected the upload (HTTP ${xhr.status}).`, {
          status: xhr.status,
          code: "BUCKET_UPLOAD_FAILED",
          field: "file",
        }),
      );
    };
    xhr.onerror = () =>
      reject(
        new UploadError("Could not reach object storage while uploading. Check your connection and try again.", {
          status: 0,
          code: "NETWORK_ERROR",
          field: "file",
        }),
      );
    xhr.ontimeout = () =>
      reject(
        new UploadError(
          `Upload to storage timed out after ${Math.round(timeoutMs / 60_000)} minutes. Try again or check your connection.`,
          { status: 0, code: "TIMEOUT", field: "file" },
        ),
      );
    xhr.onabort = () =>
      reject(new UploadError("Upload was cancelled.", { status: 0, code: "ABORTED", field: "file" }));

    xhr.send(file);
  });
}

/**
 * Direct-to-bucket flow: ask the API for a presigned URL, PUT the file straight
 * to object storage, then tell the API to finalize (set ACL) it. The file bytes
 * never pass through nginx/Node, so proxy body-size/timeout limits don't apply.
 * Throws with `code: "PRESIGN_UNAVAILABLE"` if the presign step itself fails —
 * callers should fall back to `uploadClassic` in that case.
 */
async function uploadDirectToBucket(
  file: File,
  category: UploadCategory | string,
  options?: { onProgress?: (pct: number) => void; timeoutMs?: number },
): Promise<FileUploadResponse> {
  let presign: PresignResponse;
  try {
    const res = await fetch(resolveApiPath("/api/upload/presign"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        category,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new UploadError(body?.error ?? body?.message ?? `Could not start direct upload (HTTP ${res.status}).`, {
        status: res.status,
        code: "PRESIGN_UNAVAILABLE",
        field: "file",
      });
    }
    presign = await res.json();
  } catch (err) {
    if (isUploadError(err)) throw err;
    throw new UploadError("Could not reach the server to start the upload.", {
      status: 0,
      code: "PRESIGN_UNAVAILABLE",
      field: "file",
    });
  }

  await putDirectToBucket(file, presign.uploadUrl, options);

  const finalizeRes = await fetch(resolveApiPath("/api/upload/finalize"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      category,
      key: presign.key,
      originalName: file.name,
      mimetype: file.type || "application/octet-stream",
      size: file.size,
    }),
  });
  if (!finalizeRes.ok) {
    const body = await finalizeRes.json().catch(() => null);
    throw new UploadError(body?.error ?? body?.message ?? `Upload finished but could not be finalized (HTTP ${finalizeRes.status}).`, {
      status: finalizeRes.status,
      code: "FINALIZE_FAILED",
      field: "file",
    });
  }
  const data = (await finalizeRes.json()) as FileUploadResponse;
  options?.onProgress?.(100);
  return data;
}

export async function uploadFileWithProgress(
  file: File,
  category: UploadCategory | string,
  options?: { onProgress?: (pct: number) => void; timeoutMs?: number },
): Promise<FileUploadResponse> {
  if (!DIRECT_UPLOAD_CATEGORIES.has(category)) {
    return uploadClassic(file, category, options);
  }
  try {
    return await uploadDirectToBucket(file, category, options);
  } catch (err) {
    // Object storage isn't configured (e.g. local dev) — fall back to the classic
    // proxy-through-Node flow. Once a direct PUT has actually started, failures
    // are surfaced as-is (falling back there would risk a confusing double-upload).
    if (isUploadError(err) && err.code === "PRESIGN_UNAVAILABLE") {
      return uploadClassic(file, category, options);
    }
    throw err;
  }
}
