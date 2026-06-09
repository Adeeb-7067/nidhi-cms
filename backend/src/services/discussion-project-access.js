import {
  projectsTable,
  projectMembersTable,
  clientsTable,
  usersTable,
} from "../models/schema/index.js";

const CLIENT_VISIBLE_THREAD = "project";
const INTERNAL_THREAD = "project_internal";
const COMPANY_TEAM_THREAD = "company_team";
const COMPANY_TEAM_THREAD_ID = 0;
const COMPANY_TEAM_ROLES = ["super_admin", "developer", "tester", "qa"];
const PROJECT_THREAD_TYPES = [CLIENT_VISIBLE_THREAD, INTERNAL_THREAD];
const DISCUSSION_THREAD_TYPES = [...PROJECT_THREAD_TYPES, COMPANY_TEAM_THREAD];

export function canAccessCompanyTeamDiscussion(role) {
  return role != null && COMPANY_TEAM_ROLES.includes(role);
}

/**
 * Client-visible channel: project members, linked client users, super admins.
 */
export async function getProjectDiscussionParticipantIds(projectId) {
  const ids = new Set();

  const members = await projectMembersTable.find({ projectId }, { userId: 1 }).lean().exec();
  for (const m of members) {
    if (m.userId != null) ids.add(m.userId);
  }

  const project = await projectsTable.findOne({ id: projectId }, { companyId: 1, clientId: 1 }).lean().exec();
  if (project) {
    const clientIds = [...new Set([project.companyId, project.clientId].filter((id) => id != null))];
    if (clientIds.length) {
      const clients = await clientsTable.find({ id: { $in: clientIds } }, { userId: 1 }).lean().exec();
      for (const c of clients) {
        if (c.userId != null) ids.add(c.userId);
      }
    }
  }

  const superAdmins = await usersTable
    .find({ role: "super_admin", status: "active" }, { id: 1 })
    .lean()
    .exec();
  for (const admin of superAdmins) {
    ids.add(admin.id);
  }

  return ids;
}

/**
 * Internal staff-only channel: project members (non-client roles) and super admins.
 */
export async function getProjectInternalDiscussionParticipantIds(projectId) {
  const ids = new Set();

  const members = await projectMembersTable.find({ projectId }, { userId: 1 }).lean().exec();
  const memberUserIds = members.map((m) => m.userId).filter((id) => id != null);
  if (memberUserIds.length) {
    const users = await usersTable
      .find({ id: { $in: memberUserIds }, status: "active" }, { id: 1, role: 1 })
      .lean()
      .exec();
    for (const user of users) {
      if (user.role !== "client") ids.add(user.id);
    }
  }

  const superAdmins = await usersTable
    .find({ role: "super_admin", status: "active" }, { id: 1 })
    .lean()
    .exec();
  for (const admin of superAdmins) {
    ids.add(admin.id);
  }

  return ids;
}

/** Company-wide staff channel: all active admins, developers, testers, and QA. */
export async function getCompanyTeamDiscussionParticipantIds() {
  const users = await usersTable
    .find({ role: { $in: COMPANY_TEAM_ROLES }, status: "active" }, { id: 1 })
    .lean()
    .exec();
  return new Set(users.map((u) => u.id).filter((id) => id != null));
}

export function getDiscussionParticipantIds(projectId, threadType) {
  if (threadType === COMPANY_TEAM_THREAD) {
    return getCompanyTeamDiscussionParticipantIds();
  }
  if (threadType === INTERNAL_THREAD) {
    return getProjectInternalDiscussionParticipantIds(projectId);
  }
  return getProjectDiscussionParticipantIds(projectId);
}

/** Project IDs the user may access in discussions (mirrors list projects rules). */
export async function getAccessibleProjectIds(user) {
  const role = user.role;
  if (role === "developer" || role === "tester" || role === "qa") {
    const rows = await projectMembersTable.find({ userId: user.id }, { projectId: 1 }).lean().exec();
    return rows.map((m) => m.projectId).filter((id) => id != null);
  }
  if (role === "client") {
    const clientRow = await clientsTable.findOne({ userId: user.id }).lean().exec();
    if (!clientRow) return [];
    const projects = await projectsTable
      .find({ $or: [{ companyId: clientRow.id }, { clientId: clientRow.id }] }, { id: 1 })
      .lean()
      .exec();
    return projects.map((p) => p.id);
  }
  const projects = await projectsTable.find({}, { id: 1 }).lean().exec();
  return projects.map((p) => p.id);
}

export function discussionThreadTypesForRole(role) {
  if (role === "client") return [CLIENT_VISIBLE_THREAD];
  if (canAccessCompanyTeamDiscussion(role)) return DISCUSSION_THREAD_TYPES;
  return PROJECT_THREAD_TYPES;
}

export async function canAccessDiscussionThread(user, threadType, threadId) {
  if (threadType === COMPANY_TEAM_THREAD) {
    return canAccessCompanyTeamDiscussion(user.role) && threadId === COMPANY_TEAM_THREAD_ID;
  }
  if (!PROJECT_THREAD_TYPES.includes(threadType)) return false;
  if (threadType === INTERNAL_THREAD && user.role === "client") return false;
  const allowedProjects = await getAccessibleProjectIds(user);
  return allowedProjects.includes(threadId);
}

export {
  CLIENT_VISIBLE_THREAD,
  INTERNAL_THREAD,
  COMPANY_TEAM_THREAD,
  COMPANY_TEAM_THREAD_ID,
  COMPANY_TEAM_ROLES,
  PROJECT_THREAD_TYPES,
  DISCUSSION_THREAD_TYPES,
};
