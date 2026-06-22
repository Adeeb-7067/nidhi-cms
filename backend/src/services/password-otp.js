import crypto from "crypto";
import { passwordResetTokensTable, getNextSequence } from "../models/schema/index.js";
import { Counter } from "../models/schema/counter.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { sendPasswordOtpEmail, isEmailConfigured } from "../lib/email.js";
import { isUserAccountActive } from "./user-access.js";
import { badRequest } from "../utils/route-errors.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_SEQUENCE = "password_reset_tokens";
let passwordResetIndexesReady = false;

async function ensurePasswordResetTokenIndexes() {
  if (passwordResetIndexesReady) return;
  try {
    await passwordResetTokensTable.collection.dropIndex("token_1");
  } catch {
    // Index may not exist or already non-unique.
  }
  await passwordResetTokensTable.syncIndexes();
  passwordResetIndexesReady = true;
}

async function syncPasswordResetTokenSequence() {
  const maxDoc = await passwordResetTokensTable.findOne().sort({ id: -1 }).select("id").lean();
  if (!maxDoc?.id) return;
  await Counter.findOneAndUpdate(
    { _id: OTP_SEQUENCE },
    { $max: { seq: maxDoc.id } },
    { upsert: true },
  );
}

async function createPasswordResetTokenRecord(payload) {
  await ensurePasswordResetTokenIndexes();
  await syncPasswordResetTokenSequence();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = await getNextSequence(OTP_SEQUENCE);
    try {
      await passwordResetTokensTable.create({ id, ...payload });
      return id;
    } catch (err) {
      const duplicateId =
        typeof err === "object" &&
        err !== null &&
        err.code === 11000 &&
        err.keyPattern &&
        "id" in err.keyPattern;
      if (duplicateId && attempt < 2) {
        await syncPasswordResetTokenSequence();
        continue;
      }
      throw err;
    }
  }

  badRequest("Could not issue verification code. Please try again.", "otp");
}

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function invalidateActiveOtps(userId, purpose) {
  await passwordResetTokensTable.updateMany(
    { userId, purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
}

/**
 * Create OTP, persist hash, send email.
 * @returns {{ expiresInSeconds: number, devOtp?: string }}
 */
export async function issuePasswordOtp({ user, purpose, log }) {
  if (!isUserAccountActive(user)) {
    return { expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) };
  }

  const otp = generateOtpCode();
  const otpHash = await hashPassword(otp);
  const email = user.email?.toLowerCase?.() ?? user.email;

  await invalidateActiveOtps(user.id, purpose);

  await createPasswordResetTokenRecord({
    userId: user.id,
    email,
    otpHash,
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
  });

  const mail = await sendPasswordOtpEmail({
    to: email,
    name: user.name,
    otp,
    purpose,
  });

  if (!mail.sent && log) {
    log.warn({ userId: user.id, purpose }, "Password OTP email not sent — SMTP not configured");
    if (process.env.NODE_ENV !== "production") {
      log.info({ otp, email, purpose }, "DEV ONLY: password OTP");
    }
  }

  return {
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    ...(process.env.NODE_ENV !== "production" && !mail.sent ? { devOtp: otp } : {}),
  };
}

export async function verifyPasswordOtp({ email, otp, purpose }) {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const code = String(otp ?? "").trim();

  if (!normalizedEmail) badRequest("Email is required.", "email");
  if (!/^\d{6}$/.test(code)) badRequest("Enter the 6-digit verification code.", "otp");

  const record = await passwordResetTokensTable
    .findOne({
      email: normalizedEmail,
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })
    .sort({ id: -1 });

  if (!record) {
    badRequest("This code is invalid or has expired. Request a new one.", "otp");
  }

  if ((record.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    badRequest("Too many failed attempts. Request a new verification code.", "otp");
  }

  const valid = await verifyPassword(code, record.otpHash);
  if (!valid) {
    await passwordResetTokensTable.updateOne(
      { id: record.id },
      { $inc: { attempts: 1 } },
    );
    badRequest("Incorrect verification code.", "otp");
  }

  return record;
}

export async function consumePasswordOtp(recordId) {
  await passwordResetTokensTable.updateOne(
    { id: recordId },
    { $set: { usedAt: new Date() } },
  );
}

export { isEmailConfigured, OTP_TTL_MS };
