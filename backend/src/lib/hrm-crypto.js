import crypto from "crypto";

const ALGO = "aes-256-gcm";

// HRM uses its own key so rotating inventory credentials doesn't affect
// payroll PII (bank accounts, PAN) and vice versa.
// Set HRM_ENCRYPTION_KEY in .env; falls back to SESSION_SECRET for existing
// single-key deployments, but never to a hardcoded string.
// Key is cached at module scope — scryptSync is intentionally slow and must
// not run on every encrypt/decrypt call.
let _cachedHrmKey = null;
function getHrmKey() {
  if (_cachedHrmKey) return _cachedHrmKey;
  const secret = process.env.HRM_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) throw new Error("HRM_ENCRYPTION_KEY (or SESSION_SECRET) must be set — refusing to encrypt payroll PII with a hardcoded key.");
  _cachedHrmKey = crypto.scryptSync(secret, "nexus-hrm-salt", 32);
  return _cachedHrmKey;
}

function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getHrmKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted: enc.toString("base64"), iv: iv.toString("base64"), authTag: authTag.toString("base64") };
}

function decryptSecret(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGO, getHrmKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Storage convention: three flat fields per encrypted value on the Mongoose doc.
 *   bankAccountNumber:        String  (ciphertext, base64)
 *   bankAccountNumberIv:      String  (base64)
 *   bankAccountNumberAuthTag: String  (base64)
 */

/** Returns null on empty input so callers can pass model fields through directly. */
export function encryptHrm(plaintext) {
  if (plaintext == null || plaintext === "") return null;
  const { encrypted, iv, authTag } = encryptSecret(String(plaintext));
  return { ciphertext: encrypted, iv, authTag };
}

/** Returns null when any part is missing — handles partially-populated legacy rows. */
export function decryptHrm(parts) {
  if (!parts) return null;
  const { ciphertext, iv, authTag } = parts;
  if (!ciphertext || !iv || !authTag) return null;
  return decryptSecret(ciphertext, iv, authTag);
}

/**
 * Convenience for the common "flat columns" layout where the three parts
 * live as siblings on a document. Pass the prefix and we'll read/write
 * `<prefix>`, `<prefix>Iv`, `<prefix>AuthTag`.
 *
 * Example:
 *   const patch = encryptIntoFields("bankAccountNumber", "1234567890");
 *   // patch = { bankAccountNumber: "...", bankAccountNumberIv: "...", bankAccountNumberAuthTag: "..." }
 *   await SalaryStructures.updateOne({ userId }, { $set: patch });
 *
 *   const plain = decryptFromFields("bankAccountNumber", doc);
 */
export function encryptIntoFields(prefix, plaintext) {
  const enc = encryptHrm(plaintext);
  if (!enc) {
    return {
      [prefix]: null,
      [`${prefix}Iv`]: null,
      [`${prefix}AuthTag`]: null,
    };
  }
  return {
    [prefix]: enc.ciphertext,
    [`${prefix}Iv`]: enc.iv,
    [`${prefix}AuthTag`]: enc.authTag,
  };
}

export function decryptFromFields(prefix, doc) {
  if (!doc) return null;
  return decryptHrm({
    ciphertext: doc[prefix],
    iv: doc[`${prefix}Iv`],
    authTag: doc[`${prefix}AuthTag`],
  });
}

/** Mask a decrypted value for display (e.g. "******7890"). */
export function maskTail(plain, visible = 4) {
  if (!plain) return null;
  const s = String(plain);
  if (s.length <= visible) return s;
  return "*".repeat(s.length - visible) + s.slice(-visible);
}
