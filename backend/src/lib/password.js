import bcrypt from "bcryptjs";
const SALT_ROUNDS = 12;
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
function encryptPasswordForHistory(plain) {
  const key = process.env.CRED_ENCRYPT_KEY ?? "cms-cred-key-dev";
  const buf = Buffer.from(plain, "utf8");
  const keyBuf = Buffer.from(key, "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  }
  return out.toString("base64");
}
function decryptPasswordFromHistory(encoded) {
  const key = process.env.CRED_ENCRYPT_KEY ?? "cms-cred-key-dev";
  const buf = Buffer.from(encoded, "base64");
  const keyBuf = Buffer.from(key, "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  }
  return out.toString("utf8");
}
export {
  decryptPasswordFromHistory,
  encryptPasswordForHistory,
  hashPassword,
  verifyPassword
};
