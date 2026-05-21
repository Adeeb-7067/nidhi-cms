import type { Request, Response } from "express";
import {
  usersTable,
  sessionsTable,
  passwordResetTokensTable,
  getNextSequence,
} from "@/models/schema";
import { verifyPassword, hashPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { validateStoredFileUrl } from "@/lib/file-storage";
import { badRequest, unauthorized, notFound, parseIdParam, optionalString } from "@/lib/route-errors";
import crypto from "crypto";

// POST /api/auth/login
export async function postAuthLogin(req: Request, res: Response) {
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
}


// POST /api/auth/logout
export async function postAuthLogout(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await sessionsTable.deleteOne({ refreshToken });
  }
  res.json({ success: true });
}


// POST /api/auth/refresh
export async function postAuthRefresh(req: Request, res: Response) {
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
}


// POST /api/auth/forgot-password
export async function postAuthForgotPassword(req: Request, res: Response) {
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
}


// POST /api/auth/reset-password
export async function postAuthResetPassword(req: Request, res: Response) {
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
}


// POST /api/auth/fcm-token
export async function postAuthFcmToken(req: Request, res: Response) {
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
}


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

// POST /api/auth/impersonate/:userId G?? super admin views app as developer/tester/client
export async function postAuthImpersonateByUserId(req: Request, res: Response) {
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
}


// POST /api/auth/stop-impersonate G?? revoke impersonation session only
export async function postAuthStopImpersonate(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await sessionsTable.deleteOne({ refreshToken });
  }
  res.json({ success: true });
}


// GET /api/auth/me
export async function getAuthMe(req: Request, res: Response) {
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
}


// PATCH /api/auth/me G?? update own profile
export async function patchAuthMe(req: Request, res: Response) {
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
}

