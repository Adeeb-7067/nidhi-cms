import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "../lib/db";
import { usersTable, sessionsTable, passwordResetTokensTable, credentialHistoryTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { verifyPassword, hashPassword, encryptPasswordForHistory } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again in 1 hour." },
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh attempts. Please try again shortly." },
});

// POST /api/auth/login
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { identifier, password } = req.body as { identifier: string; password: string };
  if (!identifier || !password) {
    res.status(400).json({ error: "identifier and password required" });
    return;
  }

  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, identifier.toLowerCase()),
  });

  if (!user) {
    user = await db.query.usersTable.findFirst({
      where: eq(usersTable.employeeId, identifier.toUpperCase()),
    });
  }

  if (!user || user.status !== "active") {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

  await db.insert(sessionsTable).values({
    userId: user.id,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ipAddress: req.ip,
    deviceInfo: req.headers["user-agent"] ?? null,
  });

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      subType: user.subType,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
      status: user.status,
    },
  });
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await db.delete(sessionsTable).where(eq(sessionsTable.refreshToken, refreshToken));
  }
  res.json({ success: true });
});

// POST /api/auth/refresh
router.post("/auth/refresh", refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  const session = await db.query.sessionsTable.findFirst({
    where: and(eq(sessionsTable.refreshToken, refreshToken), gt(sessionsTable.expiresAt, new Date())),
  });

  if (!session) {
    res.status(401).json({ error: "Session expired or not found" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, payload.userId) });
  if (!user || user.status !== "active") {
    res.status(401).json({ error: "User inactive" });
    return;
  }

  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });

  await db
    .update(sessionsTable)
    .set({ refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
    .where(eq(sessionsTable.id, session.id));

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      subType: user.subType,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
      status: user.status,
    },
  });
});

// POST /api/auth/forgot-password
router.post("/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    req.log.info({ userId: user.id }, "Password reset token generated");
  }
  res.json({ message: "If an account exists, a reset link has been sent." });
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  if (!token || !newPassword) {
    res.status(400).json({ error: "token and newPassword required" });
    return;
  }

  const resetToken = await db.query.passwordResetTokensTable.findFirst({
    where: and(
      eq(passwordResetTokensTable.token, token),
      gt(passwordResetTokensTable.expiresAt, new Date()),
    ),
  });

  if (!resetToken || resetToken.usedAt) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const hash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, resetToken.userId));
  await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, resetToken.id));

  res.json({ message: "Password reset successful" });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user!.id) });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    subType: user.subType,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
