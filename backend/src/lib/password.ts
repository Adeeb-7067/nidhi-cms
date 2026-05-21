import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function encryptPasswordForHistory(plain: string): string {
  // Simple reversible encoding for admin credential reveal (XOR with static key)
  // In production, use a proper KMS-backed encryption
  const key = process.env.CRED_ENCRYPT_KEY ?? "cms-cred-key-dev";
  const buf = Buffer.from(plain, "utf8");
  const keyBuf = Buffer.from(key, "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  }
  return out.toString("base64");
}

export function decryptPasswordFromHistory(encoded: string): string {
  const key = process.env.CRED_ENCRYPT_KEY ?? "cms-cred-key-dev";
  const buf = Buffer.from(encoded, "base64");
  const keyBuf = Buffer.from(key, "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  }
  return out.toString("utf8");
}
