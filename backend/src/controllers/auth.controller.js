import {
  usersTable,
  sessionsTable,
  passwordResetTokensTable,
  auditLogsTable,
  getNextSequence,
  staffEmployeeRoles,
} from "../models/schema/index.js";
import { verifyPassword, hashPassword } from "../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { validateStoredFileUrl } from "../lib/file-storage.js";
import {
  issuePasswordOtp,
  verifyPasswordOtp,
  consumePasswordOtp,
  isEmailConfigured,
} from "../services/password-otp.js";
import { badRequest, unauthorized, notFound, parseIdParam, optionalString } from "../utils/route-errors.js";
import { formatUser } from "../mappers/user-format.js";
import {
  getClientContextForUser,
  recordClientTeamActivity,
} from "../services/client-team.js";
import { clientTeamMembersTable } from "../models/schema/index.js";
async function postAuthLogin(req, res) {
  const identifier = optionalString(req.body.identifier);
  const password = optionalString(req.body.password);
  if (!identifier) badRequest("Email or employee ID is required.", "identifier");
  if (!password) badRequest("Password is required.", "password");

  const trimmed = identifier.trim();
  let user = null;

  if (trimmed.includes("@")) {
    user = await usersTable.findOne({ email: trimmed.toLowerCase() });
    if (user && staffEmployeeRoles.includes(user.role)) {
      unauthorized(
        "Developers and QA must sign in with their Employee ID (e.g. DE001), not email."
      );
    }
  } else {
    user = await usersTable.findOne({ employeeId: trimmed.toUpperCase() });
  }

  if (!user || user.status !== "active") {
    unauthorized(
      "Invalid email/employee ID or password. Check your credentials and try again."
    );
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    unauthorized(
      "Invalid email/employee ID or password. Check your credentials and try again."
    );
  }
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  const sessionId = await getNextSequence("sessions");
  await sessionsTable.create({
    id: sessionId,
    userId: user.id,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3),
    ipAddress: req.ip,
    deviceInfo: req.headers["user-agent"] ?? null
  });
  await usersTable.updateOne({ id: user.id }, { $set: { lastLoginAt: /* @__PURE__ */ new Date() } });
  try {
    const auditId = await getNextSequence("audit_logs");
    await auditLogsTable.create({
      id: auditId,
      actorId: user.id,
      action: "login",
      entityType: "session",
      entityId: sessionId,
      ipAddress: req.ip ?? null,
      metadata: { userAgent: req.headers["user-agent"] ?? null },
    });
  } catch {
    /* non-blocking */
  }
  // Record login on the company-scoped activity log AND auto-promote a
  // pending team member to "active" the first time they sign in.
  if (user.role === "client") {
    try {
      const ctx = await getClientContextForUser({ id: user.id, role: user.role });
      if (ctx) {
        if (!ctx.isAdmin && ctx.memberId) {
          await clientTeamMembersTable.updateOne(
            { id: ctx.memberId, status: "pending" },
            { $set: { status: "active", activatedAt: new Date() } },
          );
        }
        await recordClientTeamActivity({
          clientCompanyId: ctx.companyId,
          actor: { id: user.id, name: user.name },
          isAdmin: ctx.isAdmin,
          action: "login",
          entityType: "session",
          entityId: sessionId,
          summary: `${user.name} signed in.`,
          ipAddress: req.ip ?? null,
          metadata: { userAgent: req.headers["user-agent"] ?? null },
        });
      }
    } catch (err) {
      req.log?.warn?.({ err }, "Failed to record client login activity");
    }
  }
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
      status: user.status
    }
  });
}
async function postAuthLogout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await sessionsTable.deleteOne({ refreshToken });
  }
  res.json({ success: true });
}
async function postAuthRefresh(req, res) {
  const refreshToken = optionalString(req.body.refreshToken);
  if (!refreshToken) badRequest("Refresh token is required.", "refreshToken");
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    unauthorized("Your session has expired. Please sign in again.");
  }
  const session = await sessionsTable.findOne({
    refreshToken,
    expiresAt: { $gt: /* @__PURE__ */ new Date() }
  });
  if (!session) {
    unauthorized("Your session has expired. Please sign in again.");
  }
  const user = await usersTable.findOne({ id: payload.userId });
  if (!user || user.status !== "active") {
    unauthorized("Your account is inactive. Contact your administrator.");
  }
  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });
  await sessionsTable.updateOne(
    { id: session.id },
    { $set: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) } }
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
      status: user.status
    }
  });
}
async function postAuthForgotPassword(req, res) {
  const email = optionalString(req.body.email);
  if (!email) badRequest("Email is required.", "email");
  const user = await usersTable.findOne({ email: email.toLowerCase(), status: "active" });
  let meta = { expiresInSeconds: 600 };
  if (user) {
    try {
      meta = await issuePasswordOtp({
        user,
        purpose: "forgot_password",
        log: req.log,
      });
      req.log.info({ userId: user.id }, "Password reset OTP issued");
    } catch (err) {
      req.log.error(
        { err, keyPattern: err?.keyPattern, keyValue: err?.keyValue },
        "Failed to issue password reset OTP",
      );
      throw err;
    }
  }
  res.json({
    message: "If an account exists, a verification code has been sent to your email.",
    expiresInSeconds: meta.expiresInSeconds,
    emailConfigured: isEmailConfigured(),
    ...(meta.devOtp ? { devOtp: meta.devOtp } : {}),
  });
}

async function postAuthVerifyResetOtp(req, res) {
  const email = optionalString(req.body.email);
  const otp = optionalString(req.body.otp);
  await verifyPasswordOtp({ email, otp, purpose: "forgot_password" });
  res.json({ valid: true, message: "Code verified. You can set a new password." });
}

async function postAuthResetPassword(req, res) {
  const email = optionalString(req.body.email);
  const otp = optionalString(req.body.otp);
  const token = optionalString(req.body.token);
  const newPassword = optionalString(req.body.newPassword);
  if (!newPassword) badRequest("New password is required.", "newPassword");
  if (newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }

  let userId;

  if (email && otp) {
    const record = await verifyPasswordOtp({ email, otp, purpose: "forgot_password" });
    userId = record.userId;
    await consumePasswordOtp(record.id);
  } else if (token) {
    const resetToken = await passwordResetTokensTable.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });
    if (!resetToken || resetToken.usedAt) {
      badRequest("This reset link is invalid or has expired. Request a new password reset.", "token");
    }
    userId = resetToken.userId;
    await passwordResetTokensTable.updateOne(
      { id: resetToken.id },
      { $set: { usedAt: new Date() } },
    );
  } else {
    badRequest("Email and verification code are required.", "otp");
  }

  const hash = await hashPassword(newPassword);
  await usersTable.updateOne({ id: userId }, { $set: { passwordHash: hash, forcePasswordChange: false } });
  await sessionsTable.deleteMany({ userId });
  res.json({ message: "Password reset successful" });
}

async function postAuthRequestChangePasswordOtp(req, res) {
  const user = await usersTable.findOne({ id: req.user.id });
  if (!user || user.status !== "active") notFound("User");
  const meta = await issuePasswordOtp({
    user,
    purpose: "change_password",
    log: req.log,
  });
  res.json({
    message: "Verification code sent to your email.",
    expiresInSeconds: meta.expiresInSeconds,
    emailConfigured: isEmailConfigured(),
    ...(meta.devOtp ? { devOtp: meta.devOtp } : {}),
  });
}
async function postAuthFcmToken(req, res) {
  const fcmToken = optionalString(req.body.token);
  if (!fcmToken) badRequest("FCM device token is required.", "token");
  const user = await usersTable.findOne({ id: req.user.id });
  if (!user) notFound("User");
  if (!user.fcmTokens?.includes(fcmToken)) {
    await usersTable.updateOne(
      { id: user.id },
      { $addToSet: { fcmTokens: fcmToken } }
    );
  }
  res.json({ message: "Token updated successfully" });
}
function formatAuthUser(user) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    subType: user.subType,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    status: user.status
  };
}
async function postAuthImpersonateByUserId(req, res) {
  const targetId = parseIdParam(req.params.userId, "user id");
  const target = await usersTable.findOne({ id: targetId });
  if (!target || target.status !== "active") {
    notFound("User (must be active)");
  }
  const allowedRoles = ["developer", "tester", "qa", "freelancer", "client"];
  if (!allowedRoles.includes(target.role)) {
    badRequest(
      "View-as only works for developer, tester, QA, freelancer, or client portal accounts.",
      "userId"
    );
  }
  if (target.id === req.user.id) {
    badRequest("You cannot view the app as yourself.", "userId");
  }
  const accessToken = signAccessToken({ userId: target.id, role: target.role });
  const refreshToken = signRefreshToken({ userId: target.id, role: target.role });
  const sessionId = await getNextSequence("sessions");
  await sessionsTable.create({
    id: sessionId,
    userId: target.id,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3),
    ipAddress: req.ip,
    deviceInfo: `impersonation by admin ${req.user.id}; ${req.headers["user-agent"] ?? ""}`.slice(0, 500)
  });
  req.log.info(
    { adminId: req.user.id, targetId: target.id, targetRole: target.role },
    "Super admin started impersonation"
  );
  res.json({
    accessToken,
    refreshToken,
    user: formatAuthUser(target),
    impersonator: {
      id: req.user.id,
      name: req.user.name,
      role: "super_admin"
    }
  });
}
async function postAuthStopImpersonate(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await sessionsTable.deleteOne({ refreshToken });
  }
  res.json({ success: true });
}
async function getAuthMe(req, res) {
  const user = await usersTable.findOne({ id: req.user.id });
  if (!user) notFound("User");
  res.json(formatUser(user, { withPresence: true }));
}
async function patchAuthMe(req, res) {
  const { name, designation, avatarUrl, email } = req.body;
  validateStoredFileUrl(avatarUrl, "avatarUrl");
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : void 0;
  if (normalizedEmail) {
    const existing = await usersTable.findOne({
      email: normalizedEmail,
      id: { $ne: req.user.id },
    });
    if (existing) {
      badRequest("This email is already in use by another account.", "email");
    }
  }
  const updated = await usersTable.findOneAndUpdate(
    { id: req.user.id },
    {
      $set: {
        ...name && { name },
        ...normalizedEmail && { email: normalizedEmail },
        ...designation !== void 0 && { designation },
        ...avatarUrl !== void 0 && { avatarUrl: avatarUrl || null }
      }
    },
    { new: true }
  );
  if (!updated) notFound("User");
  res.json(formatUser(updated, { withPresence: true }));
}
export {
  getAuthMe,
  patchAuthMe,
  postAuthFcmToken,
  postAuthForgotPassword,
  postAuthImpersonateByUserId,
  postAuthLogin,
  postAuthLogout,
  postAuthRefresh,
  postAuthRequestChangePasswordOtp,
  postAuthResetPassword,
  postAuthStopImpersonate,
  postAuthVerifyResetOtp,
};
