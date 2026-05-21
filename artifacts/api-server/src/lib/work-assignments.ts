import {
  usersTable,
  projectMembersTable,
  projectsTable,
  notificationsTable,
  getNextSequence,
} from "@workspace/db/schema";
import { projectCompanyId } from "./company-access";
import { notifyUser } from "./realtime";
import { HttpError } from "./http-error";

export async function getProjectMemberIds(projectId: number): Promise<number[]> {
  const members = await projectMembersTable.find({ projectId }, { userId: 1 });
  return members.map((m) => m.userId);
}

export async function assertProjectMember(userId: number, projectId: number): Promise<void> {
  const member = await projectMembersTable.findOne({ projectId, userId });
  if (!member) {
    throw new HttpError(
      400,
      "The selected assignee is not a member of this project. Add them to the project team first.",
      { code: "ASSIGNEE_NOT_IN_PROJECT", field: "assigneeId" },
    );
  }
}

export async function assertAssigneeRole(
  assigneeId: number,
  allowedRoles: Array<"developer" | "tester">,
): Promise<{ id: number; name: string; role: string; employeeId: string | null }> {
  const user = await usersTable.findOne({ id: assigneeId, status: "active" });
  if (!user) {
    throw new HttpError(
      400,
      "Assignee not found or their account is inactive. Choose an active team member.",
      { code: "ASSIGNEE_INVALID", field: "assigneeId" },
    );
  }
  if (!allowedRoles.includes(user.role as "developer" | "tester")) {
    throw new HttpError(
      400,
      `This item can only be assigned to ${allowedRoles.join(" or ")} roles.`,
      { code: "ASSIGNEE_WRONG_ROLE", field: "assigneeId" },
    );
  }
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId ?? null,
  };
}

/** Bugs are always assigned to developers. */
export async function resolveBugAssignee(
  assigneeId: number | null | undefined,
  projectId: number,
): Promise<number | null> {
  if (assigneeId == null || assigneeId === 0) return null;
  const assignee = await assertAssigneeRole(assigneeId, ["developer"]);
  await assertProjectMember(assignee.id, projectId);
  return assignee.id;
}

/** Work tasks can go to developers or QA. */
export async function resolveTaskAssignee(
  assigneeId: number | null | undefined,
  projectId: number,
): Promise<number | null> {
  if (assigneeId == null || assigneeId === 0) return null;
  const assignee = await assertAssigneeRole(assigneeId, ["developer", "tester"]);
  await assertProjectMember(assignee.id, projectId);
  return assignee.id;
}

export async function notifyAssignment(params: {
  targetUserId: number;
  actorId: number;
  actorName: string;
  title: string;
  body: string;
  type: "task" | "bug";
  projectId: number;
  entityId: number;
}): Promise<void> {
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
    isRead: false,
  });

  await notifyUser(params.targetUserId, "notification", {
    id: notifId,
    title: params.title,
    body: params.body,
    type: params.type,
    projectId: params.projectId,
    entityId: params.entityId,
  });
}
