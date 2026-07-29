import {
  isCmsObjectKey,
  objectKeyFromStoredRef,
} from "../../../lib/object-storage.js";

/** Local screenshots live outside public `/uploads` static — proxy-only. */
export const PRIVATE_SCREENSHOT_URL_PREFIX = "/private/screenshots/";

export function extractAccessToken(req) {
  const auth = req?.headers?.authorization;
  if (typeof auth === "string") {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1].trim();
  }
  const x = req?.headers?.["x-access-token"];
  if (typeof x === "string" && x.trim()) return x.trim();
  return "";
}

/** Build gallery DTO with auth'd content proxy URL (never raw storage URLs). */
export function formatScreenshot(doc, req) {
  const token = extractAccessToken(req);
  const host = req?.get?.("host");
  const protocol = req?.protocol || "http";
  const fileUrl =
    token && host
      ? `${protocol}://${host}/api/screenshots/${doc.id}/content?token=${encodeURIComponent(token)}`
      : null;

  return {
    id: doc.id,
    userId: doc.userId,
    sessionId: doc.sessionId ?? null,
    projectId: doc.projectId ?? null,
    fileUrl,
    fileSize: doc.fileSize ?? null,
    takenAt: doc.takenAt,
  };
}

export function guessImageContentType(nameOrPath) {
  const lower = String(nameOrPath || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

/**
 * Resolve a stored screenshot fileUrl into a safe serve target.
 * @returns {{ ok: true, kind: 'object', key: string } | { ok: true, kind: 'private-local'|'legacy-uploads', relativePath: string } | { ok: false }}
 */
export function resolveScreenshotFileRef(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return { ok: false };

  if (/^https?:\/\//i.test(fileUrl)) {
    const key = objectKeyFromStoredRef(fileUrl);
    if (!key || !isCmsObjectKey(key)) return { ok: false };
    return { ok: true, kind: "object", key };
  }

  if (fileUrl.startsWith(PRIVATE_SCREENSHOT_URL_PREFIX)) {
    const relativePath = fileUrl.slice(PRIVATE_SCREENSHOT_URL_PREFIX.length);
    if (!isSafeRelativeUploadPath(relativePath)) return { ok: false };
    return { ok: true, kind: "private-local", relativePath };
  }

  if (fileUrl.startsWith("/uploads/")) {
    const relativePath = fileUrl.slice("/uploads/".length);
    if (!isSafeRelativeUploadPath(relativePath)) return { ok: false };
    return { ok: true, kind: "legacy-uploads", relativePath };
  }

  return { ok: false };
}

function isSafeRelativeUploadPath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return false;
  if (relativePath.includes("\0")) return false;
  const parts = relativePath.split(/[/\\]/);
  return parts.every((p) => p && p !== "." && p !== "..");
}
