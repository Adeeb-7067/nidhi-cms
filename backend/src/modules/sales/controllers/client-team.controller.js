import crypto from "node:crypto";
import {
  clientsTable,
  clientTeamMembersTable,
  usersTable,
  credentialHistoryTable,
  sessionsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { paginateModel, toIso } from "../../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import {
  hashPassword,
  encryptPasswordForHistory,
} from "../../../lib/password.js";
import { sendClientTeamInvitationEmail, isEmailConfigured } from "../../../lib/email.js";
import { evictUserFromAuthCache } from "../../../middlewares/auth.js";
import { revokeUserAccess } from "../../identity/services/user-access.js";
import { recordClientTeamActivity } from "../../identity/services/client-team.js";
import {
  assertBdeOwnsCustomerById,
  bdeOwnsCustomer,
  findBdeOwnedCustomerIds,
} from "../../../utils/sales-bde-customer-scope.js";

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

function formatSalesTeamMember(member, user, companyName) {
  return {
    id: member.id,
    userId: member.userId,
    clientCompanyId: member.clientCompanyId,
    companyName: companyName ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    phoneNumber: user?.phoneNumber ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    title: member.title ?? null,
    status: member.status,
    invitedAt: toIso(member.invitedAt),
    activatedAt: toIso(member.activatedAt),
    deactivatedAt: toIso(member.deactivatedAt),
    lastInviteSentAt: toIso(member.lastInviteSentAt),
    inviteCount: member.inviteCount ?? 1,
    lastLoginAt: toIso(user?.lastLoginAt),
    lastSeenAt: toIso(user?.lastSeenAt),
    createdAt: toIso(member.createdAt),
  };
}

async function buildListFilter(req) {
  const { status, search, customerId } = req.query;
  const base = {};

  if (customerId) {
    const cid = Number(customerId);
    await assertBdeOwnsCustomerById(clientsTable, req.user, cid, "Customer");
    base.clientCompanyId = cid;
  } else if (req.user.role === "bde") {
    const ids = await findBdeOwnedCustomerIds(clientsTable, req.user.id);
    base.clientCompanyId = { $in: ids.length ? ids : [-1] };
  }

  if (status) base.status = status;

  const term = optionalString(search);
  if (!term) return { filter: base, empty: false };

  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = { $regex: safe, $options: "i" };

  const [matchingUsers, matchingCompanies] = await Promise.all([
    usersTable.find({ $or: [{ name: re }, { email: re }] }).select({ id: 1 }).lean(),
    (async () => {
      const companyFind = { companyName: re };
      if (Number.isFinite(base.clientCompanyId)) {
        companyFind.id = base.clientCompanyId;
      } else if (base.clientCompanyId?.$in) {
        companyFind.id = base.clientCompanyId;
      }
      return clientsTable.find(companyFind).select({ id: 1 }).lean();
    })(),
  ]);

  const or = [];
  if (matchingUsers.length) or.push({ userId: { $in: matchingUsers.map((u) => u.id) } });
  if (matchingCompanies.length) {
    or.push({ clientCompanyId: { $in: matchingCompanies.map((c) => c.id) } });
  }
  if (!or.length) return { filter: null, empty: true };

  const filter = Object.keys(base).length ? { $and: [base, { $or: or }] } : { $or: or };
  return { filter, empty: false };
}

async function findMemberForSalesStaff(req, memberId) {
  const member = await clientTeamMembersTable.findOne({ id: memberId }).lean();
  if (!member) notFound("Team member");
  if (req.user.role === "bde") {
    const client = await clientsTable.findOne({ id: member.clientCompanyId }).lean();
    if (!client || !bdeOwnsCustomer(client, req.user.id)) notFound("Team member");
  }
  const company = await clientsTable
    .findOne({ id: member.clientCompanyId })
    .select({ companyName: 1 })
    .lean();
  return { member, companyName: company?.companyName ?? null };
}

async function listSalesClientTeamMembers(req, res) {
  const pagination = parsePagination(req.query);
  const { filter, empty } = await buildListFilter(req);
  if (empty) {
    res.json({ members: [], total: 0, page: pagination.page, limit: pagination.limit });
    return;
  }

  const { items, total, page, limit } = await paginateModel(
    clientTeamMembersTable,
    filter,
    pagination,
    { sort: { createdAt: -1 } },
  );

  const userIds = items.map((m) => m.userId);
  const companyIds = [...new Set(items.map((m) => m.clientCompanyId))];
  const [users, companies] = await Promise.all([
    userIds.length
      ? usersTable
          .find({ id: { $in: userIds } })
          .select({
            id: 1,
            name: 1,
            email: 1,
            avatarUrl: 1,
            phoneNumber: 1,
            lastLoginAt: 1,
            lastSeenAt: 1,
          })
          .lean()
      : [],
    companyIds.length
      ? clientsTable.find({ id: { $in: companyIds } }).select({ id: 1, companyName: 1 }).lean()
      : [],
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const companyMap = new Map(companies.map((c) => [c.id, c.companyName]));

  res.json({
    members: items.map((m) =>
      formatSalesTeamMember(m, userMap.get(m.userId), companyMap.get(m.clientCompanyId)),
    ),
    total,
    page,
    limit,
  });
}

async function deactivateSalesClientTeamMember(req, res) {
  const memberId = parseIdParam(req.params.id, "team member id");
  const { member } = await findMemberForSalesStaff(req, memberId);

  await clientTeamMembersTable.updateOne(
    { id: memberId },
    { $set: { status: "inactive", deactivatedAt: new Date() } },
  );
  await usersTable.updateOne({ id: member.userId }, { $set: { status: "inactive" } });
  await revokeUserAccess(member.userId);

  const user = await usersTable.findOne({ id: member.userId }).lean();
  await recordClientTeamActivity({
    clientCompanyId: member.clientCompanyId,
    actor: req.user,
    isAdmin: true,
    action: "member_deactivated",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Deactivated ${user?.name ?? "team member"} (sales staff).`,
    ipAddress: req.ip ?? null,
  });

  res.json({ success: true, message: "Team member deactivated." });
}

async function reactivateSalesClientTeamMember(req, res) {
  const memberId = parseIdParam(req.params.id, "team member id");
  const { member } = await findMemberForSalesStaff(req, memberId);

  await clientTeamMembersTable.updateOne(
    { id: memberId },
    { $set: { status: "active", activatedAt: new Date() }, $unset: { deactivatedAt: "" } },
  );
  await usersTable.updateOne({ id: member.userId }, { $set: { status: "active" } });
  evictUserFromAuthCache(member.userId);

  const refreshed = await clientTeamMembersTable.findOne({ id: memberId }).lean();
  const user = await usersTable.findOne({ id: member.userId }).lean();
  await recordClientTeamActivity({
    clientCompanyId: member.clientCompanyId,
    actor: req.user,
    isAdmin: true,
    action: "member_reactivated",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Reactivated ${user?.name ?? "team member"} (sales staff).`,
    ipAddress: req.ip ?? null,
  });

  res.json({ member: formatSalesTeamMember(refreshed, user, null) });
}

async function resendSalesClientTeamInvitation(req, res) {
  const memberId = parseIdParam(req.params.id, "team member id");
  const { member, companyName } = await findMemberForSalesStaff(req, memberId);
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
      $set: {
        lastInviteSentAt: new Date(),
        status: member.status === "inactive" ? "pending" : member.status,
      },
      $inc: { inviteCount: 1 },
    },
  );

  let invitationSent = false;
  try {
    const result = await sendClientTeamInvitationEmail({
      to: user.email,
      memberName: user.name,
      companyName: companyName ?? "Your company",
      inviterName: req.user.name ?? "Satyakabir",
      loginEmail: user.email,
      temporaryPassword: tempPassword,
      resend: true,
    });
    invitationSent = result.sent === true;
  } catch (err) {
    req.log?.warn?.({ err }, "Failed to resend client team invitation email");
  }

  await recordClientTeamActivity({
    clientCompanyId: member.clientCompanyId,
    actor: req.user,
    isAdmin: true,
    action: "invitation_resent",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Re-sent invitation to ${user.name} (sales staff).`,
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

async function resetSalesClientTeamPassword(req, res) {
  const memberId = parseIdParam(req.params.id, "team member id");
  const { member } = await findMemberForSalesStaff(req, memberId);
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
    clientCompanyId: member.clientCompanyId,
    actor: req.user,
    isAdmin: true,
    action: "password_reset",
    entityType: "client_team_member",
    entityId: memberId,
    summary: `Reset password for ${user.name} (sales staff).`,
    ipAddress: req.ip ?? null,
  });

  res.json({
    message: "Password reset.",
    ...(explicit ? {} : { temporaryPassword: newPassword }),
  });
}

export {
  listSalesClientTeamMembers,
  deactivateSalesClientTeamMember,
  reactivateSalesClientTeamMember,
  resendSalesClientTeamInvitation,
  resetSalesClientTeamPassword,
};
