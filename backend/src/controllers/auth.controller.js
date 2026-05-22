import {
  usersTable,
  sessionsTable,
  passwordResetTokensTable,
  getNextSequence
} from "@/models/schema";
import { verifyPassword, hashPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { validateStoredFileUrl } from "@/lib/file-storage";
import { badRequest, unauthorized, notFound, parseIdParam, optionalString } from "@/utils/route-errors";
import crypto from "crypto";
async function postAuthLogin(req, res) {
  const identifier = optionalString(req.body.identifier);
  const password = optionalString(req.body.password);
  if (!identifier) badRequest("Email or employee ID is required.", "identifier");
  if (!password) badRequest("Password is required.", "password");
  let user = await usersTable.findOne({ email: identifier.toLowerCase() });
  if (!user) {
    user = await usersTable.findOne({ employeeId: identifier.toUpperCase() });
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
  const user = await usersTable.findOne({ email: email.toLowerCase() });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenId = await getNextSequence("password_reset_tokens");
    await passwordResetTokensTable.create({
      id: tokenId,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1e3)
    });
    req.log.info({ userId: user.id }, "Password reset token generated");
  }
  res.json({ message: "If an account exists, a reset link has been sent." });
}
async function postAuthResetPassword(req, res) {
  const token = optionalString(req.body.token);
  const newPassword = optionalString(req.body.newPassword);
  if (!token) badRequest("Reset token is required.", "token");
  if (!newPassword) badRequest("New password is required.", "newPassword");
  if (newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }
  const resetToken = await passwordResetTokensTable.findOne({
    token,
    expiresAt: { $gt: /* @__PURE__ */ new Date() }
  });
  if (!resetToken || resetToken.usedAt) {
    badRequest("This reset link is invalid or has expired. Request a new password reset.", "token");
  }
  const hash = await hashPassword(newPassword);
  await usersTable.updateOne({ id: resetToken.userId }, { $set: { passwordHash: hash } });
  await passwordResetTokensTable.updateOne({ id: resetToken.id }, { $set: { usedAt: /* @__PURE__ */ new Date() } });
  res.json({ message: "Password reset successful" });
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
  const allowedRoles = ["developer", "tester", "client"];
  if (!allowedRoles.includes(target.role)) {
    badRequest(
      "View-as only works for developer, tester, or client portal accounts.",
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
    createdAt: user.createdAt.toISOString()
  });
}
async function patchAuthMe(req, res) {
  const { name, designation, avatarUrl } = req.body;
  validateStoredFileUrl(avatarUrl, "avatarUrl");
  const updated = await usersTable.findOneAndUpdate(
    { id: req.user.id },
    {
      $set: {
        ...name && { name },
        ...designation !== void 0 && { designation },
        ...avatarUrl !== void 0 && { avatarUrl: avatarUrl || null }
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
    createdAt: updated.createdAt.toISOString()
  });
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
  postAuthResetPassword,
  postAuthStopImpersonate
};
