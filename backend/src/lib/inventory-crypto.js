import crypto from "crypto";
const ALGO = "aes-256-gcm";
function getKey() {
  const secret = process.env.INVENTORY_ENCRYPTION_KEY || process.env.SESSION_SECRET || "dev-inventory-key";
  return crypto.scryptSync(secret, "nexus-inventory-salt", 32);
}
function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}
function decryptSecret(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]);
  return dec.toString("utf8");
}
export {
  decryptSecret,
  encryptSecret
};
