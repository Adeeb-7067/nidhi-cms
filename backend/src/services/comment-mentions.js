import { projectMembersTable, usersTable } from "../models/schema/index.js";
import { collectProjectCommentRecipientIds } from "./comment-notification-recipients.js";
import {
  INTERNAL_THREAD,
  COMPANY_TEAM_THREAD,
  COMPANY_TEAM_ROLES,
} from "./discussion-project-access.js";

/** @typedef {{ id: number, name: string }} MentionCandidate */

/**
 * @param {string} content
 * @param {MentionCandidate[]} candidates
 * @returns {number[]}
 */
export function extractMentionedUserIdsFromContent(content, candidates) {
  if (!content || !candidates?.length) return [];
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  const ids = new Set();
  for (const c of sorted) {
    const token = `@${c.name}`;
    let idx = content.indexOf(token);
    while (idx !== -1) {
      const after = content[idx + token.length];
      if (!after || /[\s.,;:!?)\]]/.test(after)) {
        ids.add(c.id);
      }
      idx = content.indexOf(token, idx + 1);
    }
  }
  return [...ids];
}

/**
 * @param {number[]} mentionedUserIds
 * @param {Set<number>} allowedIds
 * @returns {number[]}
 */
export function sanitizeMentionedUserIds(mentionedUserIds, allowedIds) {
  if (!Array.isArray(mentionedUserIds)) return [];
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds);
  const out = new Set();
  for (const raw of mentionedUserIds) {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0 && allowed.has(id)) out.add(id);
  }
  return [...out];
}

/**
 * @param {number} projectId
 * @returns {Promise<MentionCandidate[]>}
 */
export async function resolveProjectMentionCandidates(projectId, threadType = "project") {
  const members = await projectMembersTable.find({ projectId }).lean().exec();
  const userIds = [...new Set(members.map((m) => m.userId).filter((id) => id != null))];
  if (!userIds.length) return [];
  const users = await usersTable
    .find({ id: { $in: userIds }, status: "active" }, { id: 1, name: 1, role: 1 })
    .lean()
    .exec();
  return users
    .filter((u) => u?.id && u?.name && (threadType !== INTERNAL_THREAD || u.role !== "client"))
    .map((u) => ({ id: u.id, name: String(u.name).trim() }));
}

/**
 * @param {number} projectId
 * @param {number} authorId
 * @param {number[]} requestedIds
 * @param {string} content
 * @returns {Promise<number[]>}
 */
export async function resolveCompanyTeamMentionCandidates() {
  const users = await usersTable
    .find({ role: { $in: COMPANY_TEAM_ROLES }, status: "active" }, { id: 1, name: 1 })
    .lean()
    .exec();
  return users
    .filter((u) => u?.id && u?.name)
    .map((u) => ({ id: u.id, name: String(u.name).trim() }));
}

export async function resolveCompanyTeamMentionIds(authorId, requestedIds, content) {
  const allowed = await collectProjectCommentRecipientIds(0, null, COMPANY_TEAM_THREAD);
  const candidates = await resolveCompanyTeamMentionCandidates();
  const fromBody = extractMentionedUserIdsFromContent(content, candidates);
  const merged = sanitizeMentionedUserIds(
    [...(requestedIds ?? []), ...fromBody],
    allowed,
  );
  return merged.filter((id) => id !== authorId);
}

export async function resolveProjectMentionIds(projectId, authorId, requestedIds, content, threadType = "project") {
  const allowed = await collectProjectCommentRecipientIds(projectId, null, threadType);
  const candidates = await resolveProjectMentionCandidates(projectId, threadType);
  const superAdmins = await usersTable
    .find({ role: "super_admin", status: "active" }, { id: 1, name: 1 })
    .lean()
    .exec();
  for (const admin of superAdmins) {
    if (admin?.id && admin?.name) {
      allowed.add(admin.id);
      candidates.push({ id: admin.id, name: String(admin.name).trim() });
    }
  }
  const fromBody = extractMentionedUserIdsFromContent(content, candidates);
  const merged = sanitizeMentionedUserIds(
    [...(requestedIds ?? []), ...fromBody],
    allowed,
  );
  return merged.filter((id) => id !== authorId);
}
