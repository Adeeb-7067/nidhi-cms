import { bugAssigneeRoles, devPortalStaffRoles } from "../constants/user-roles.js";
import {
  usersTable,
  projectMembersTable,
  projectsTable,
  notificationsTable,
  getNextSequence
} from "../models/schema/index.js";
import { projectCompanyId } from "./access/company-access.js";
import { notifyUser } from "../lib/realtime.js";
import { HttpError } from "../lib/http-error.js";
async function getProjectMemberIds(projectId) {
  const members = await projectMembersTable.find({ projectId }, { userId: 1 });
  return members.map((m) => m.userId);
}
async function assertProjectMember(userId, projectId) {
  const member = await projectMembersTable.findOne({ projectId, userId });
  if (!member) {
    throw new HttpError(
      400,
      "The selected assignee is not a member of this project. Add them to the project team first.",
      { code: "ASSIGNEE_NOT_IN_PROJECT", field: "assigneeId" }
    );
  }
}
async function assertAssigneeRole(assigneeId, allowedRoles) {
  const user = await usersTable.findOne({ id: assigneeId, status: "active" });
  if (!user) {
    throw new HttpError(
      400,
      "Assignee not found or their account is inactive. Choose an active team member.",
      { code: "ASSIGNEE_INVALID", field: "assigneeId" }
    );
  }
  if (!allowedRoles.includes(user.role)) {
    throw new HttpError(
      400,
      `This item can only be assigned to ${allowedRoles.join(" or ")} roles.`,
      { code: "ASSIGNEE_WRONG_ROLE", field: "assigneeId" }
    );
  }
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId ?? null
  };
}
async function resolveBugAssignee(assigneeId, projectId) {
  if (assigneeId == null || assigneeId === 0) return null;
  const assignee = await assertAssigneeRole(assigneeId, bugAssigneeRoles);
  await assertProjectMember(assignee.id, projectId);
  return assignee.id;
}

async function resolveBugAssignees(assigneeIds, projectId) {
  if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) return [];
  const unique = [...new Set(assigneeIds.map((id) => Number(id)).filter((id) => id > 0))];
  const resolved = [];
  for (const id of unique) {
    const devId = await resolveBugAssignee(id, projectId);
    if (devId) resolved.push(devId);
  }
  return resolved;
}
async function resolveTaskAssignee(assigneeId, projectId) {
  if (assigneeId == null || assigneeId === 0) return null;
  const assignee = await assertAssigneeRole(assigneeId, devPortalStaffRoles);
  await assertProjectMember(assignee.id, projectId);
  return assignee.id;
}
async function notifyAssignment(params) {
  if (params.targetUserId === params.actorId) return;
  const project = await projectsTable.findOne({ id: params.projectId });
  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId: params.targetUserId,
    title: params.title,
    body: params.body,
    type: params.type,
    companyId: project ? projectCompanyId(project) : null,
    projectId: params.projectId,
    entityType: params.type,
    entityId: params.entityId,
    relatedId: params.entityId,
    isRead: false
  });
  await notifyUser(params.targetUserId, "notification", {
    id: notifId,
    title: params.title,
    body: params.body,
    type: params.type,
    projectId: params.projectId,
    entityId: params.entityId
  });
}
export {
  assertAssigneeRole,
  assertProjectMember,
  getProjectMemberIds,
  notifyAssignment,
  resolveBugAssignee,
  resolveBugAssignees,
  resolveTaskAssignee
};
