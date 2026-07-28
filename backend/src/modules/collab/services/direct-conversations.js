import {
  commentsTable,
  directConversationsTable,
  usersTable,
  clientsTable,
  clientTeamMembersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { staffEmployeeRoles } from "../../../constants/user-roles.js";
import { toIso } from "../../../utils/mongo-list.js";
import { logger } from "../../../lib/logger.js";

export const DIRECT_THREAD_TYPE = "direct";

function commentPreviewText(row) {
  const text = typeof row.content === "string" ? row.content.trim() : "";
  if (text) return text.length > 80 ? `${text.slice(0, 77)}...` : text;
  if (row.attachmentUrl) {
    const name = row.attachmentName?.toLowerCase() ?? "";
    if (row.attachmentMimeType === "application/pdf" || name.endsWith(".pdf")) {
      return "Sent a PDF";
    }
    if (
      row.attachmentMimeType?.startsWith("audio/") ||
      /\.(webm|ogg|mp3|m4a|wav)$/.test(name)
    ) {
      return "Sent a voice message";
    }
    if (row.attachmentMimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(name)) {
      return "Sent an image";
    }
    return "Sent an attachment";
  }
  return "New message";
}

export function normalizeParticipantPair(userIdA, userIdB) {
  const a = Number(userIdA);
  const b = Number(userIdB);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
    return null;
  }
  return a < b ? [a, b] : [b, a];
}

export function buildDirectConversationPairKey(pair) {
  return `${pair[0]}:${pair[1]}`;
}

export function canInitiateDirectMessage(initiator) {
  return initiator?.role === "super_admin";
}

/** Roles the admin may start a 1:1 chat with. */
export async function isEligibleDirectMessageTarget(userId) {
  const user = await usersTable
    .findOne({ id: userId, status: "active" }, { id: 1, role: 1 })
    .lean()
    .exec();
  if (!user) return false;
  if (user.role === "super_admin") return false;
  if (user.role === "client") return true;
  return staffEmployeeRoles.includes(user.role);
}

export async function getDirectConversationById(conversationId) {
  return directConversationsTable.findOne({ id: conversationId }).lean().exec();
}

export async function canAccessDirectConversation(user, conversationId) {
  if (!user?.id) return false;
  const conversation = await getDirectConversationById(conversationId);
  if (!conversation?.participantIds?.length) return false;
  return conversation.participantIds.includes(user.id);
}

export async function getDirectConversationParticipantIds(conversationId) {
  const conversation = await getDirectConversationById(conversationId);
  if (!conversation?.participantIds?.length) return new Set();
  return new Set(conversation.participantIds);
}

function isDuplicateKeyError(err) {
  return typeof err === "object" && err !== null && err.code === 11000;
}

function isLegacyParticipantIdsConflict(err) {
  if (!isDuplicateKeyError(err)) return false;
  const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
  if (keys.length === 1 && keys[0] === "participantIds") return true;
  const msg = typeof err.message === "string" ? err.message : "";
  return /participantIds(?!.*pairKey)/.test(msg);
}

export async function getOrCreateDirectConversation(initiatorId, targetUserId) {
  const pair = normalizeParticipantPair(initiatorId, targetUserId);
  if (!pair) return null;

  const pairKey = buildDirectConversationPairKey(pair);

  const findExisting = () =>
    directConversationsTable.findOne({ pairKey }).lean().exec();

  const findLegacy = () =>
    directConversationsTable
      .findOne({ participantIds: { $all: pair, $size: 2 } })
      .lean()
      .exec();

  let existing = await findExisting();
  if (!existing) {
    existing = await findLegacy();
    if (existing && existing.pairKey !== pairKey) {
      await directConversationsTable.updateOne(
        { id: existing.id },
        { $set: { pairKey, participantIds: pair } },
      );
      existing = { ...existing, pairKey, participantIds: pair };
    }
  }
  if (existing) return existing;

  const attemptCreate = async () => {
    const nextId = await getNextSequence("direct_conversations");
    const created = await directConversationsTable.create({
      id: nextId,
      participantIds: pair,
      pairKey,
    });
    return created.toObject();
  };

  try {
    return await attemptCreate();
  } catch (err) {
    if (isLegacyParticipantIdsConflict(err)) {
      // Legacy unique index on the array column is still alive — drop it and retry once.
      const { dropLegacyParticipantIdsUniqueIndex } = await import(
        "./direct-conversation-migration.js"
      );
      const dropped = await dropLegacyParticipantIdsUniqueIndex();
      logger.warn(
        { dropped, initiatorId, targetUserId },
        "Legacy participantIds unique index blocked create; retrying after drop",
      );
      const raced = (await findExisting()) ?? (await findLegacy());
      if (raced) return raced;
      try {
        return await attemptCreate();
      } catch (retryErr) {
        if (isDuplicateKeyError(retryErr)) {
          const raced2 = (await findExisting()) ?? (await findLegacy());
          if (raced2) return raced2;
        }
        throw retryErr;
      }
    }
    if (isDuplicateKeyError(err)) {
      const raced = (await findExisting()) ?? (await findLegacy());
      if (raced) return raced;
    }
    throw err;
  }
}

function formatStaffRoleLabel(role) {
  if (role === "developer") return "Developer";
  if (role === "tester") return "Tester";
  if (role === "qa") return "QA";
  if (role === "freelancer") return "Freelancer";
  return role?.replace(/_/g, " ") ?? "Team member";
}

async function buildClientSubtitleMap(clientUsers) {
  const subtitles = new Map();
  if (!clientUsers.length) return subtitles;

  const userIds = clientUsers.map((u) => u.id);
  const adminCompanies = await clientsTable
    .find({ userId: { $in: userIds } }, { id: 1, userId: 1, companyName: 1 })
    .lean()
    .exec();
  const adminByUserId = new Map(adminCompanies.map((c) => [c.userId, c]));

  const teamMemberIds = userIds.filter((id) => !adminByUserId.has(id));
  const teamMembers = teamMemberIds.length
    ? await clientTeamMembersTable
        .find({ userId: { $in: teamMemberIds }, status: { $ne: "inactive" } }, { userId: 1, title: 1, clientCompanyId: 1 })
        .lean()
        .exec()
    : [];
  const teamByUserId = new Map(teamMembers.map((m) => [m.userId, m]));

  const companyIds = [...new Set(teamMembers.map((m) => m.clientCompanyId).filter((id) => id != null))];
  const companies = companyIds.length
    ? await clientsTable.find({ id: { $in: companyIds } }, { id: 1, companyName: 1 }).lean().exec()
    : [];
  const companyById = new Map(companies.map((c) => [c.id, c]));

  for (const user of clientUsers) {
    const adminCompany = adminByUserId.get(user.id);
    if (adminCompany) {
      subtitles.set(user.id, `${adminCompany.companyName} · Client admin`);
      continue;
    }
    const member = teamByUserId.get(user.id);
    if (member) {
      const company = companyById.get(member.clientCompanyId);
      const companyName = company?.companyName ?? "Client";
      const title = member.title?.trim();
      subtitles.set(
        user.id,
        title ? `${companyName} · ${title}` : `${companyName} · Team member`,
      );
      continue;
    }
    subtitles.set(user.id, "Client");
  }

  return subtitles;
}

function formatPeerFromRow(user, subtitle, viewerId) {
  const category =
    user.role === "client"
      ? "client"
      : staffEmployeeRoles.includes(user.role)
        ? "staff"
        : "other";

  return {
    id: user.id,
    name: user.name ?? "Unknown",
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    subtitle: subtitle ?? null,
    category,
    isSelf: user.id === viewerId,
  };
}

async function formatPeerUsers(peerIds, viewerId) {
  const uniqueIds = [...new Set(peerIds.filter((id) => id != null))];
  if (!uniqueIds.length) return new Map();

  const users = await usersTable
    .find(
      { id: { $in: uniqueIds }, status: "active" },
      { id: 1, name: 1, email: 1, avatarUrl: 1, role: 1, designation: 1 },
    )
    .lean()
    .exec();

  const clientUsers = users.filter((u) => u.role === "client");
  const clientSubtitles = await buildClientSubtitleMap(clientUsers);
  const out = new Map();

  for (const user of users) {
    let subtitle;
    if (user.role === "client") {
      subtitle = clientSubtitles.get(user.id) ?? "Client";
    } else if (staffEmployeeRoles.includes(user.role)) {
      subtitle = user.designation?.trim() || formatStaffRoleLabel(user.role);
    } else {
      subtitle = formatStaffRoleLabel(user.role);
    }
    out.set(user.id, formatPeerFromRow(user, subtitle, viewerId));
  }

  return out;
}

async function loadLatestDirectMessages(conversationIds) {
  if (!conversationIds.length) return new Map();
  const rows = await commentsTable
    .aggregate([
      {
        $match: {
          threadType: DIRECT_THREAD_TYPE,
          threadId: { $in: conversationIds },
          $or: [{ parentId: null }, { parentId: { $exists: false } }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$threadId",
          id: { $first: "$id" },
          authorId: { $first: "$authorId" },
          content: { $first: "$content" },
          attachmentUrl: { $first: "$attachmentUrl" },
          attachmentName: { $first: "$attachmentName" },
          attachmentMimeType: { $first: "$attachmentMimeType" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ])
    .exec();

  const authorIds = [...new Set(rows.map((r) => r.authorId).filter((id) => id != null))];
  const authors = authorIds.length
    ? await usersTable.find({ id: { $in: authorIds } }, { id: 1, name: 1 }).lean().exec()
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a.name ?? "Unknown"]));

  const out = new Map();
  for (const row of rows) {
    out.set(row._id, {
      lastMessageAt: toIso(row.createdAt) ?? new Date().toISOString(),
      lastPreview: commentPreviewText(row),
      lastAuthorName: authorMap.get(row.authorId) ?? "Unknown",
      lastAuthorId: row.authorId,
    });
  }
  return out;
}

export async function listDirectConversationsForUser(userId) {
  const rows = await directConversationsTable
    .find({ participantIds: userId })
    .sort({ updatedAt: -1 })
    .lean()
    .exec();

  const peerIds = rows
    .map((row) => row.participantIds.find((id) => id !== userId))
    .filter((id) => id != null);
  const peerMap = await formatPeerUsers(peerIds, userId);
  const latestByConversation = await loadLatestDirectMessages(rows.map((r) => r.id));
  const conversations = [];

  for (const row of rows) {
    const peerId = row.participantIds.find((id) => id !== userId);
    if (peerId == null) continue;
    const peer = peerMap.get(peerId);
    if (!peer) continue;
    const latest = latestByConversation.get(row.id);
    conversations.push({
      id: row.id,
      peerUser: peer,
      lastMessageAt: latest?.lastMessageAt ?? null,
      lastPreview: latest?.lastPreview ?? null,
      lastAuthorName: latest?.lastAuthorName ?? null,
      lastAuthorId: latest?.lastAuthorId ?? null,
      updatedAt: toIso(row.updatedAt) ?? toIso(row.createdAt) ?? new Date().toISOString(),
    });
  }

  conversations.sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.updatedAt;
    const bTime = b.lastMessageAt ?? b.updatedAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return { conversations };
}

export async function formatDirectConversationForUser(row, userId) {
  const peerId = row.participantIds.find((id) => id !== userId);
  if (peerId == null) return null;
  const peerMap = await formatPeerUsers([peerId], userId);
  const peer = peerMap.get(peerId);
  if (!peer) return null;
  const latestByConversation = await loadLatestDirectMessages([row.id]);
  const latest = latestByConversation.get(row.id);
  return {
    id: row.id,
    peerUser: peer,
    lastMessageAt: latest?.lastMessageAt ?? null,
    lastPreview: latest?.lastPreview ?? null,
    lastAuthorName: latest?.lastAuthorName ?? null,
    lastAuthorId: latest?.lastAuthorId ?? null,
    updatedAt: toIso(row.updatedAt) ?? toIso(row.createdAt) ?? new Date().toISOString(),
  };
}

export async function listDirectMessageContacts(adminUser) {
  if (!canInitiateDirectMessage(adminUser)) {
    return { clientContacts: [], staffContacts: [] };
  }

  const users = await usersTable
    .find(
      {
        status: "active",
        id: { $ne: adminUser.id },
        role: { $in: ["client", ...staffEmployeeRoles] },
      },
      { id: 1, name: 1, email: 1, avatarUrl: 1, role: 1, designation: 1 },
    )
    .sort({ name: 1 })
    .lean()
    .exec();

  const clientUsers = users.filter((u) => u.role === "client");
  const staffUsers = users.filter((u) => staffEmployeeRoles.includes(u.role));
  const clientSubtitles = await buildClientSubtitleMap(clientUsers);

  const clientContacts = clientUsers.map((user) =>
    formatPeerFromRow(user, clientSubtitles.get(user.id) ?? "Client", adminUser.id),
  );
  const staffContacts = staffUsers.map((user) =>
    formatPeerFromRow(
      user,
      user.designation?.trim() || formatStaffRoleLabel(user.role),
      adminUser.id,
    ),
  );

  return { clientContacts, staffContacts };
}

export async function touchDirectConversation(conversationId) {
  await directConversationsTable.updateOne({ id: conversationId }, { $set: { updatedAt: new Date() } });
}
