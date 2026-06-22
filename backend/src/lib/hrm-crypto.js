import { encryptSecret, decryptSecret } from "./inventory-crypto.js";

/**
 * Thin HRM-facing wrapper around the platform's AES-256-GCM secret encryption
 * (lib/inventory-crypto.js). The mechanism, key derivation, and on-disk
 * layout are identical to how InventoryCredentials encrypts vendor passwords —
 * that's the platform's existing pattern for "sensitive secrets at rest."
 *
 * Why a separate file:
 *   - Call sites in services/hrm/* are explicit about which subsystem they
 *     belong to (grep-ability for the security review).
 *   - If HR ever needs a different key (e.g. dedicated HRM_ENCRYPTION_KEY env)
 *     we only flip one import; today it reuses inventory-crypto's getKey()
 *     which itself falls back to SESSION_SECRET.
 *
 * Storage convention (recommended): on the Mongoose doc, persist three fields
 * per encrypted value. Example for bankAccountNumber:
 *   bankAccountNumber:           String  (the ciphertext, base64)
 *   bankAccountNumberIv:         String  (base64)
 *   bankAccountNumberAuthTag:    String  (base64)
 *
 * Or use `encryptToObject` / `decryptFromObject` below if you prefer storing
 * the three parts in a sub-document.
 */

/**
 * Encrypts a plaintext string. Returns null when the input is empty/nullish
 * so callers can pass model fields through directly.
 *
 * @param {string | null | undefined} plaintext
 * @returns {{ ciphertext: string, iv: string, authTag: string } | null}
 */
export function encryptHrm(plaintext) {
  if (plaintext == null || plaintext === "") return null;
  const { encrypted, iv, authTag } = encryptSecret(String(plaintext));
  return { ciphertext: encrypted, iv, authTag };
}

/**
 * Decrypts a previously-encrypted value. Returns null when any of the three
 * parts is missing — useful for partially-populated legacy rows.
 *
 * @param {{ ciphertext?: string, iv?: string, authTag?: string } | null | undefined} parts
 * @returns {string | null}
 */
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
