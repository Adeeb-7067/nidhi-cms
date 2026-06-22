import crypto from "node:crypto";
import {
  clientsTable,
  clientTeamMembersTable,
  clientTeamActivityTable,
  usersTable,
  credentialHistoryTable,
  sessionsTable,
  getNextSequence,
} from "../models/schema/index.js";
import {
  CLIENT_PORTAL_SECTIONS,
  CLIENT_SECTION_LABELS,
  CLIENT_PERMISSION_LEVELS,
  defaultMemberPermissions,
  sanitisePermissions,
} from "../constants/client-team.js";
import {
  hashPassword,
  encryptPasswordForHistory,
} from "../lib/password.js";
import { sendClientTeamInvitationEmail, isEmailConfigured } from "../lib/email.js";
import { evictUserFromAuthCache } from "../middlewares/auth.js";
import { revokeUserAccess } from "../services/user-access.js";
import {
  loadClientContext,
  recordClientTeamActivity,
  hydrateActorMeta,
} from "../services/client-team.js";
import {
  badRequest,
  conflict,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../utils/route-errors.js";
import { paginateModel, toIso } from "../utils/mongo-list.js";

/** Generate a 12-character URL-safe temporary password. */
function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

function sectionsCatalog() {
  return CLIENT_PORTAL_SECTIONS.map((key) => ({
    key,
    label: CLIENT_SECTION_LABELS[key] ?? key,
  }));
}

function formatMember(member, user) {
  return {
    id: member.id,
    userId: member.userId,
    clientCompanyId: member.clientCompanyId,
    name: user?.name ?? null,
    email: user?.email ?? null,
    phoneNumber: user?.phoneNumber ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    title: member.title ?? null,
    status: member.status,
    permissions: sanitisePermissions(member.permissions),
    invitedAt: toIso(member.invitedAt),
    activatedAt: toIso(member.activatedAt),
    deactivatedAt: toIso(member.deactivatedAt),
    lastInviteSentAt: toIso(member.lastInviteSentAt),
    inviteCount: member.inviteCount ?? 1,
    lastLoginAt: toIso(user?.lastLoginAt),
    lastSeenAt: toIso(user?.lastSeenAt),
    userStatus: user?.status ?? "inactive",
    invitedByUserId: member.invitedByUserId,
    createdAt: toIso(member.createdAt),
    updatedAt: toIso(member.updatedAt),
  };
}

async function loadAdminContext(req) {
  const ctx = await loadClientContext(req);
  if (!ctx || !ctx.isAdmin) {
    notFound("Client company");
  }
  return ctx;
}

async function findMemberInCompany(companyId, memberId) {
  const member = await clientTeamMembersTable.findOne({
    id: memberId,
    clientCompanyId: companyId,
  });
  if (!member) notFound("Team member");
  return member;
}

/* ------------------------------------------------------------------ */
/*                       GET /api/client-team/me                      */
/* ------------------------------------------------------------------ */

async function getClientTeamMe(req, res) {
  const ctx = await loadClientContext(req);
  if (!ctx) {
    res.json({
      isClientUser: false,
      isAdmin: false,
      companyId: null,
      companyName: null,
      memberId: null,
      permissions: {},
      sections: sectionsCatalog(),
      permissionLevels: CLIENT_PERMISSION_LEVELS,
    });
    return;
  }
  res.json({
    isClientUser: true,
    isAdmin: ctx.isAdmin,
    companyId: ctx.companyId,
    companyName: ctx.companyName,
    memberId: ctx.memberId,
    permissions: ctx.permissions,
    sections: sectionsCatalog(),
    permissionLevels: CLIENT_PERMISSION_LEVELS,
  });
}

/* ------------------------------------------------------------------ */
/*                  GET /api/client-team/members                      */
/* ------------------------------------------------------------------ */

async function getClientTeamMembers(req, res) {
  const ctx = await loadAdminContext(req);
  const pagination = parsePagination(req.query);
  const status = optionalString(req.query.status);
  const search = optionalString(req.query.search);

  const query = { clientCompanyId: ctx.companyId };
  if (status) query.status = status;

  // Resolve the search term against the parent users table FIRST so
  // pagination + total reflect actual matches (otherwise filtering after
  // pagination silently drops matches on later pages and reports the wrong
  // total to the UI).
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = await usersTable
      .find(
        { $or: [{ name: { $regex: safe, $options: "i" } }, { email: { $regex: safe, $options: "i" } }] },
        { id: 1 },
      )
      .lean();
    const matchedIds = matches.map((u) => u.id);
    if (!matchedIds.length) {
      res.json({ members: [], total: 0, page: pagination.page, limit: pagination.limit });
      return;
    }
    query.userId = { $in: matchedIds };
  }

  const { items, total, page, limit } = await paginateModel(
    clientTeamMembersTable,
    query,
    pagination,
    { sort: { createdAt: -1 } },
  );

  const userIds = items.map((m) => m.userId);
  const users = await usersTable
    .find(
      { id: { $in: userIds } },
      {
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        phoneNumber: 1,
        status: 1,
        lastLoginAt: 1,
        lastSeenAt: 1,
      },
    )
    .lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const formatted = items.map((m) => formatMember(m, userMap.get(m.userId)));

  res.json({ members: formatted, total, page, limit });
}

/* ------------------------------------------------------------------ */
/*                  POST /api/client-team/members                     */
/* ------------------------------------------------------------------ */

async function postClientTeamMembers(req, res) {
  const ctx = await loadAdminContext(req);
  const body = req.body ?? {};
  const name = optionalString(body.name);
  const emailInput = optionalString(body.email);
  const title = optionalString(body.title);
  const phoneNumber = optionalString(body.phoneNumber);
  const sendEmail = body.sendInvitationEmail !== false;
  const customPassword = optionalString(body.password);

  if (!name) badRequest("Name is required.", "name");
  if (!emailInput) badRequest("Email is required.", "email");

  const email = emailInput.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest("Enter a valid email address.", "email");
  }
  if (customPassword && customPassword.length < 8) {
    badRequest("Password must be at least 8 characters.", "password");
  }

  const existingUser = await usersTable.findOne({ email }).lean();
  if (existingUser) {
    conflict("This email is already registered to another account.", "email");
  }

  const tempPassword = customPassword ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  const userId = await getNextSequence("users");
  const user = await usersTable.create({
    id: userId,
    name,
    email,
    passwordHash,
    role: "client",
    subType: "client_team_member",
    designation: title ?? "Team Member",
    phoneNumber: phoneNumber ?? null,
    status: "active",
    forcePasswordChange: !customPassword,
  });

  let memberId;
  let memberDoc;
  try {
    memberId = await getNextSequence("client_team_members");
    memberDoc = await clientTeamMembersTable.create({
      id: memberId,
      clientCompanyId: ctx.companyId,
      userId: user.id,
      invitedByUserId: req.user.id,
      title: title ?? null,
      permissions: sanitisePermissions(body.permissions ?? defaultMemberPermissions()),
      status: "pending",
      invitedAt: new Date(),
      lastInviteSentAt: new Date(),
      inviteCount: 1,
    });

    const credId = await getNextSequence("credential_history");
    await credentialHistoryTable.create({
      id: credId,
      userId: user.id,
      entryNumber: 1,
      setByUserId: req.user.id,
      setByLabel: req.user.name,
      passwordEncrypted: encryptPasswordForHistory(tempPassword),
      trigger: "initial_setup",
      status: "active",
    });
  } catch (err) {
    // Best-effort rollback so we don't leave any partial documents behind
    // if an inner write fails. Order: member row first (depends on user),
    // then user row. Failures inside cleanup are swallowed so we still
    // bubble up the original error to the caller.
    if (memberDoc?.id != null) {
      await clientTeamMembersTable.deleteOne({ id: memberDoc.id }).catch(() => undefined);
    }
    await usersTable.deleteOne({ id: user.id }).catch(() => undefined);
    throw err;
  }

  let invitationSent = false;
  if (sendEmail) {
    try {
      const result = await sendClientTeamInvitationEmail({
        to: email,
        memberName: name,
        companyName: ctx.companyName,
        inviterName: req.user.name ?? "Your Client Admin",
        loginEmail: email,
        temporaryPassword: tempPassword,
      });
      invitationSent = result.sent === true;
    } catch (err) {
      req.log?.warn?.({ err }, "Failed to send client team invitation email");
    }
  }

  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "member_invited",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Invited ${name} (${email}) to the team.`,
    metadata: { sendEmail, invitationSent, emailConfigured: isEmailConfigured() },
    ipAddress: req.ip ?? null,
  });

  res.status(201).json({
    member: formatMember(memberDoc, user),
    invitation: {
      requested: sendEmail,
      sent: invitationSent,
      emailConfigured: isEmailConfigured(),
      ...(invitationSent ? {} : { temporaryPassword: tempPassword }),
    },
  });
}

/* ------------------------------------------------------------------ */
/*                GET /api/client-team/members/:id                    */
/* ------------------------------------------------------------------ */

async function getClientTeamMemberById(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);
  const user = await usersTable
    .findOne(
      { id: member.userId },
      {
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        phoneNumber: 1,
        status: 1,
        lastLoginAt: 1,
        lastSeenAt: 1,
      },
    )
    .lean();
  res.json({ member: formatMember(member, user) });
}

/* ------------------------------------------------------------------ */
/*               PATCH /api/client-team/members/:id                   */
/* ------------------------------------------------------------------ */

async function patchClientTeamMember(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);
  const body = req.body ?? {};

  const userUpdates = {};
  if (body.name !== undefined) {
    const name = optionalString(body.name);
    if (!name) badRequest("Name cannot be blank.", "name");
    userUpdates.name = name;
  }
  if (body.email !== undefined) {
    const email = optionalString(body.email)?.toLowerCase();
    if (!email) badRequest("Email cannot be blank.", "email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      badRequest("Enter a valid email address.", "email");
    }
    const taken = await usersTable.findOne({ email, id: { $ne: member.userId } }).lean();
    if (taken) conflict("This email is already registered to another account.", "email");
    userUpdates.email = email;
  }
  if (body.phoneNumber !== undefined) {
    userUpdates.phoneNumber = optionalString(body.phoneNumber) ?? null;
  }
  if (Object.keys(userUpdates).length) {
    await usersTable.updateOne({ id: member.userId }, { $set: userUpdates });
    evictUserFromAuthCache(member.userId);
  }

  const memberUpdates = {};
  if (body.title !== undefined) memberUpdates.title = optionalString(body.title) ?? null;
  if (Object.keys(memberUpdates).length) {
    await clientTeamMembersTable.updateOne({ id: memberId }, { $set: memberUpdates });
  }

  const refreshed = await clientTeamMembersTable.findOne({ id: memberId });
  const user = await usersTable
    .findOne(
      { id: member.userId },
      {
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        phoneNumber: 1,
        status: 1,
        lastLoginAt: 1,
        lastSeenAt: 1,
      },
    )
    .lean();

  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "member_updated",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Updated ${user?.name ?? "team member"}'s details.`,
    metadata: { fields: Object.keys({ ...userUpdates, ...memberUpdates }) },
    ipAddress: req.ip ?? null,
  });

  res.json({ member: formatMember(refreshed, user) });
}

/* ------------------------------------------------------------------ */
/*           PATCH /api/client-team/members/:id/permissions           */
/* ------------------------------------------------------------------ */

async function patchClientTeamMemberPermissions(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);
  const next = sanitisePermissions(req.body?.permissions ?? {});
  const previous = sanitisePermissions(member.permissions);
  await clientTeamMembersTable.updateOne(
    { id: memberId },
    { $set: { permissions: next } },
  );

  const user = await usersTable
    .findOne(
      { id: member.userId },
      {
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        phoneNumber: 1,
        status: 1,
        lastLoginAt: 1,
        lastSeenAt: 1,
      },
    )
    .lean();

  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "permissions_updated",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Updated permissions for ${user?.name ?? "team member"}.`,
    metadata: { previous, next },
    ipAddress: req.ip ?? null,
  });

  const refreshed = await clientTeamMembersTable.findOne({ id: memberId });
  res.json({ member: formatMember(refreshed, user) });
}

/* ------------------------------------------------------------------ */
/*               DELETE /api/client-team/members/:id                  */
/* ------------------------------------------------------------------ */

async function deleteClientTeamMember(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);

  await clientTeamMembersTable.updateOne(
    { id: memberId },
    { $set: { status: "inactive", deactivatedAt: new Date() } },
  );
  await usersTable.updateOne({ id: member.userId }, { $set: { status: "inactive" } });
  await revokeUserAccess(member.userId);

  const user = await usersTable.findOne({ id: member.userId }).lean();
  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "member_deactivated",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Deactivated ${user?.name ?? "team member"}.`,
    ipAddress: req.ip ?? null,
  });

  res.json({ message: "Team member deactivated." });
}

/* ------------------------------------------------------------------ */
/*           POST /api/client-team/members/:id/reactivate             */
/* ------------------------------------------------------------------ */

async function postClientTeamMemberReactivate(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);

  await clientTeamMembersTable.updateOne(
    { id: memberId },
    { $set: { status: "active", activatedAt: new Date() }, $unset: { deactivatedAt: "" } },
  );
  await usersTable.updateOne({ id: member.userId }, { $set: { status: "active" } });
  evictUserFromAuthCache(member.userId);

  const refreshed = await clientTeamMembersTable.findOne({ id: memberId });
  const user = await usersTable
    .findOne(
      { id: member.userId },
      {
        id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        phoneNumber: 1,
        status: 1,
        lastLoginAt: 1,
        lastSeenAt: 1,
      },
    )
    .lean();

  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "member_reactivated",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Reactivated ${user?.name ?? "team member"}.`,
    ipAddress: req.ip ?? null,
  });

  res.json({ member: formatMember(refreshed, user) });
}

/* ------------------------------------------------------------------ */
/*       POST /api/client-team/members/:id/resend-invitation          */
/* ------------------------------------------------------------------ */

async function postClientTeamMemberResendInvitation(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);
  const user = await usersTable.findOne({ id: member.userId });
  if (!user) notFound("Team member account");

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  await usersTable.updateOne(
    { id: user.id },
    { $set: { passwordHash, forcePasswordChange: true, status: "active" } },
  );
  await sessionsTable.deleteMany({ userId: user.id });
  evictUserFromAuthCache(user.id);

  // Track the new credential in history (so super-admin reveal still works
  // and policy expiry rotates correctly).
  await credentialHistoryTable.updateMany(
    { userId: user.id, status: "active" },
    { $set: { status: "superseded" } },
  );
  const credCount = await credentialHistoryTable.countDocuments({ userId: user.id });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: user.id,
    entryNumber: credCount + 1,
    setByUserId: req.user.id,
    setByLabel: req.user.name,
    passwordEncrypted: encryptPasswordForHistory(tempPassword),
    trigger: "admin_reset",
    status: "active",
  });

  await clientTeamMembersTable.updateOne(
    { id: memberId },
    {
      $set: { lastInviteSentAt: new Date(), status: member.status === "inactive" ? "pending" : member.status },
      $inc: { inviteCount: 1 },
    },
  );

  let invitationSent = false;
  try {
    const result = await sendClientTeamInvitationEmail({
      to: user.email,
      memberName: user.name,
      companyName: ctx.companyName,
      inviterName: req.user.name ?? "Your Client Admin",
      loginEmail: user.email,
      temporaryPassword: tempPassword,
      resend: true,
    });
    invitationSent = result.sent === true;
  } catch (err) {
    req.log?.warn?.({ err }, "Failed to resend client team invitation email");
  }

  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "invitation_resent",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Re-sent invitation to ${user.name}.`,
    metadata: { invitationSent },
    ipAddress: req.ip ?? null,
  });

  res.json({
    invitation: {
      sent: invitationSent,
      emailConfigured: isEmailConfigured(),
      ...(invitationSent ? {} : { temporaryPassword: tempPassword }),
    },
  });
}

/* ------------------------------------------------------------------ */
/*         POST /api/client-team/members/:id/reset-password           */
/* ------------------------------------------------------------------ */

async function postClientTeamMemberResetPassword(req, res) {
  const ctx = await loadAdminContext(req);
  const memberId = parseIdParam(req.params.id, "team member id");
  const member = await findMemberInCompany(ctx.companyId, memberId);
  const user = await usersTable.findOne({ id: member.userId });
  if (!user) notFound("Team member account");

  const explicit = optionalString(req.body?.newPassword);
  if (explicit && explicit.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }
  const newPassword = explicit ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(newPassword);

  await usersTable.updateOne(
    { id: user.id },
    { $set: { passwordHash, forcePasswordChange: !explicit } },
  );
  await sessionsTable.deleteMany({ userId: user.id });
  evictUserFromAuthCache(user.id);

  await credentialHistoryTable.updateMany(
    { userId: user.id, status: "active" },
    { $set: { status: "superseded" } },
  );
  const credCount = await credentialHistoryTable.countDocuments({ userId: user.id });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: user.id,
    entryNumber: credCount + 1,
    setByUserId: req.user.id,
    setByLabel: req.user.name,
    passwordEncrypted: encryptPasswordForHistory(newPassword),
    trigger: "admin_reset",
    status: "active",
  });

  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: true,
    action: "password_reset",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Reset password for ${user.name}.`,
    ipAddress: req.ip ?? null,
  });

  res.json({
    message: "Password reset.",
    ...(explicit ? {} : { temporaryPassword: newPassword }),
  });
}

/* ------------------------------------------------------------------ */
/*                  GET /api/client-team/activity                     */
/* ------------------------------------------------------------------ */

async function getClientTeamActivity(req, res) {
  const ctx = await loadClientContext(req);
  if (!ctx) notFound("Client company");
  const pagination = parsePagination(req.query);

  const query = { clientCompanyId: ctx.companyId };
  if (!ctx.isAdmin) {
    // Non-admin team members can only see their own activity.
    query.actorUserId = req.user.id;
  } else {
    const userId = req.query.userId ? Number.parseInt(String(req.query.userId), 10) : null;
    if (Number.isFinite(userId)) query.actorUserId = userId;
    const action = optionalString(req.query.action);
    if (action) query.action = action;
  }

  const { items, total, page, limit } = await paginateModel(
    clientTeamActivityTable,
    query,
    pagination,
    { sort: { createdAt: -1 } },
  );

  const actorIds = [...new Set(items.map((row) => row.actorUserId).filter(Boolean))];
  const actors = await hydrateActorMeta(actorIds);

  res.json({
    activities: items.map((row) => {
      const actor = actors.get(row.actorUserId);
      return {
        id: row.id,
        action: row.action,
        section: row.section ?? null,
        entityType: row.entityType ?? null,
        entityId: row.entityId ?? null,
        summary: row.summary ?? null,
        metadata: row.metadata ?? null,
        ipAddress: row.ipAddress ?? null,
        actorUserId: row.actorUserId ?? null,
        actorName: actor?.name ?? row.actorName ?? "Unknown",
        actorEmail: actor?.email ?? null,
        actorAvatarUrl: actor?.avatarUrl ?? null,
        actorIsAdmin: row.actorIsAdmin ?? false,
        createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      };
    }),
    total,
    page,
    limit,
  });
}

export {
  deleteClientTeamMember,
  getClientTeamActivity,
  getClientTeamMe,
  getClientTeamMemberById,
  getClientTeamMembers,
  patchClientTeamMember,
  patchClientTeamMemberPermissions,
  postClientTeamMemberReactivate,
  postClientTeamMemberResendInvitation,
  postClientTeamMemberResetPassword,
  postClientTeamMembers,
};
