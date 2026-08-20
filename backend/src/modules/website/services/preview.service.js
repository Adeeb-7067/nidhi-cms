import crypto from "crypto";

const PREVIEW_SECRET = process.env.PREVIEW_SIGNING_SECRET || "satyakabir-cms-preview-secret-2026";

/**
 * Generates a short-lived (15-min) HMAC-SHA256 signed preview token.
 */
export function generatePreviewToken(pageId, userId) {
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes lifetime
  const payload = `${pageId}.${userId}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", PREVIEW_SECRET)
    .update(payload)
    .digest("hex");

  return {
    token: `${payload}.${signature}`,
    expiresAt,
  };
}

/**
 * Verifies a preview token's HMAC signature and timestamp freshness.
 */
export function verifyPreviewToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing token" };
  }

  const parts = token.split(".");
  if (parts.length !== 4) {
    return { valid: false, reason: "Malformed token format" };
  }

  const [pageId, userId, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, reason: "Preview token expired" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", PREVIEW_SECRET)
    .update(`${pageId}.${userId}.${expiresAtStr}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { valid: false, reason: "Invalid token signature" };
  }

  return { valid: true, pageId, userId, expiresAt };
}
