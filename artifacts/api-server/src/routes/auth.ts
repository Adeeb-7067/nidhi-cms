import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  usersTable,
  sessionsTable,
  passwordResetTokensTable,
  getNextSequence,
} from "@workspace/db/schema";
import { verifyPassword, hashPassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { requireAuth, requireRole } from "../middlewares/auth";
import { validateStoredFileUrl } from "../lib/file-storage";
import { badRequest, unauthorized, notFound, parseIdParam, optionalString } from "../lib/route-errors";
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
  const identifier = optionalString((req.body as { identifier?: string }).identifier);
  const password = optionalString((req.body as { password?: string }).password);
  if (!identifier) badRequest("Email or employee ID is required.", "identifier");
  if (!password) badRequest("Password is required.", "password");

  let user = await usersTable.findOne({ email: identifier.toLowerCase() });
  if (!user) {
    user = await usersTable.findOne({ employeeId: identifier.toUpperCase() });
  }

  if (!user || user.status !== "active") {
    unauthorized(
      "Invalid email/employee ID or password. Check your credentials and try again.",
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    unauthorized(
      "Invalid email/employee ID or password. Check your credentials and try again.",
    );
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

  const sessionId = await getNextSequence("sessions");
  await sessionsTable.create({
    id: sessionId,
    userId: user.id,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ipAddress: req.ip,
    deviceInfo: req.headers["user-agent"] ?? null,
  });

  await usersTable.updateOne({ id: user.id }, { $set: { lastLoginAt: new Date() } });

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
    await sessionsTable.deleteOne({ refreshToken });
  }
  res.json({ success: true });
});

// POST /api/auth/refresh
router.post("/auth/refresh", refreshLimiter, async (req, res) => {
  const refreshToken = optionalString((req.body as { refreshToken?: string }).refreshToken);
  if (!refreshToken) badRequest("Refresh token is required.", "refreshToken");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    unauthorized("Your session has expired. Please sign in again.");
  }

  const session = await sessionsTable.findOne({
    refreshToken,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    unauthorized("Your session has expired. Please sign in again.");
  }

  const user = await usersTable.findOne({ id: payload!.userId });
  if (!user || user.status !== "active") {
    unauthorized("Your account is inactive. Contact your administrator.");
  }

  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });

  await sessionsTable.updateOne(
    { id: session.id },
    { $set: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
  );

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
  const email = optionalString((req.body as { email?: string }).email);
  if (!email) badRequest("Email is required.", "email");
  const user = await usersTable.findOne({ email: email!.toLowerCase() });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenId = await getNextSequence("password_reset_tokens");
    await passwordResetTokensTable.create({
      id: tokenId,
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
  const token = optionalString((req.body as { token?: string }).token);
  const newPassword = optionalString((req.body as { newPassword?: string }).newPassword);
  if (!token) badRequest("Reset token is required.", "token");
  if (!newPassword) badRequest("New password is required.", "newPassword");
  if (newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }

  const resetToken = await passwordResetTokensTable.findOne({
    token,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken || resetToken.usedAt) {
    badRequest("This reset link is invalid or has expired. Request a new password reset.", "token");
  }

  const hash = await hashPassword(newPassword);
  await usersTable.updateOne({ id: resetToken.userId }, { $set: { passwordHash: hash } });
  await passwordResetTokensTable.updateOne({ id: resetToken.id }, { $set: { usedAt: new Date() } });

  res.json({ message: "Password reset successful" });
});

// POST /api/auth/fcm-token
router.post("/auth/fcm-token", requireAuth, async (req, res) => {
  const fcmToken = optionalString((req.body as { token?: string }).token);
  if (!fcmToken) badRequest("FCM device token is required.", "token");

  const user = await usersTable.findOne({ id: req.user!.id });
  if (!user) notFound("User");

  // Add token if it doesn't already exist in the array
  if (!user.fcmTokens?.includes(fcmToken)) {
    await usersTable.updateOne(
      { id: user.id },
      { $addToSet: { fcmTokens: fcmToken } },
    );
  }

  res.json({ message: "Token updated successfully" });
});

function formatAuthUser(user: {
  id: number;
  employeeId: string | null;
  name: string;
  email: string;
  role: string;
  subType: string | null;
  designation: string | null;
  avatarUrl: string | null;
  status: string;
}) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    subType: user.subType,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };
}

// POST /api/auth/impersonate/:userId — super admin views app as developer/tester/client
router.post(
  "/auth/impersonate/:userId",
  requireAuth,
  requireRole("super_admin"),
  async (req, res) => {
    const targetId = parseIdParam(req.params.userId, "user id");

    const target = await usersTable.findOne({ id: targetId });
    if (!target || target.status !== "active") {
      notFound("User (must be active)");
    }

    const allowedRoles = ["developer", "tester", "client"] as const;
    if (!allowedRoles.includes(target.role as (typeof allowedRoles)[number])) {
      badRequest(
        "View-as only works for developer, tester, or client portal accounts.",
        "userId",
      );
    }

    if (target.id === req.user!.id) {
      badRequest("You cannot view the app as yourself.", "userId");
    }

    const accessToken = signAccessToken({ userId: target.id, role: target.role });
    const refreshToken = signRefreshToken({ userId: target.id, role: target.role });

    const sessionId = await getNextSequence("sessions");
    await sessionsTable.create({
      id: sessionId,
      userId: target.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      deviceInfo: `impersonation by admin ${req.user!.id}; ${req.headers["user-agent"] ?? ""}`.slice(0, 500),
    });

    req.log.info(
      { adminId: req.user!.id, targetId: target.id, targetRole: target.role },
      "Super admin started impersonation",
    );

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(target),
      impersonator: {
        id: req.user!.id,
        name: req.user!.name,
        role: "super_admin",
      },
    });
  },
);

// POST /api/auth/stop-impersonate — revoke impersonation session only
router.post("/auth/stop-impersonate", requireAuth, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await sessionsTable.deleteOne({ refreshToken });
  }
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await usersTable.findOne({ id: req.user!.id });
  if (!user) notFound("User");
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

// PATCH /api/auth/me — update own profile
router.patch("/auth/me", requireAuth, async (req, res) => {
  const { name, designation, avatarUrl } = req.body as {
    name?: string;
    designation?: string;
    avatarUrl?: string;
  };

  validateStoredFileUrl(avatarUrl, "avatarUrl");

  const updated = await usersTable.findOneAndUpdate(
    { id: req.user!.id },
    {
      $set: {
        ...(name && { name }),
        ...(designation !== undefined && { designation }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      }
    },
    { new: true }
  );
  
  if (!updated) notFound("User");
  res.json({
    id: updated.id,
    employeeId: updated.employeeId,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    subType: updated.subType,
    designation: updated.designation,
    avatarUrl: updated.avatarUrl,
    status: updated.status,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
