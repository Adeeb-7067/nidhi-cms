import {
  tasksTable,
  usersTable,
  projectsTable,
  projectMembersTable,
  getNextSequence
} from "@/models/schema";
import { projectCompanyId } from "@/services/access/company-access";
import {
  notifyAssignment,
  resolveTaskAssignee
} from "@/services/work-assignments";
import { badRequest, forbidden, notFound } from "@/utils/route-errors";
async function generateTaskNumber() {
  const count = await getNextSequence("tasks_count");
  return `TASK-${String(count).padStart(4, "0")}`;
}
async function formatTask(task) {
  const [project, creator, assignee] = await Promise.all([
    projectsTable.findOne({ id: task.projectId }),
    usersTable.findOne({ id: task.createdById }),
    task.assigneeId ? usersTable.findOne({ id: task.assigneeId }) : null
  ]);
  return {
    id: task.id,
    taskNumber: task.taskNumber,
    projectId: task.projectId,
    projectName: project?.name ?? "Unknown",
    createdById: task.createdById,
    createdByName: creator?.name ?? "Unknown",
    assigneeId: task.assigneeId,
    assigneeName: assignee?.name ?? null,
    assigneeRole: assignee?.role ?? null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    dueDate: task.dueDate,
    labels: task.labels ?? [],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null
  };
}
async function buildTaskListQuery(userId, role, params) {
  const query = {};
  const { projectId, status, assigneeId, scope } = params;
  if (projectId) query.projectId = Number.parseInt(projectId, 10);
  if (status) query.status = status;
  if (role === "super_admin") {
    if (assigneeId) query.assigneeId = Number.parseInt(assigneeId, 10);
    if (scope === "unassigned") query.assigneeId = null;
    if (scope === "mine") query.assigneeId = userId;
    return query;
  }
  if (role === "developer" || role === "tester") {
    const projectIdNum = projectId ? Number.parseInt(projectId, 10) : NaN;
    const assigneeIdNum = assigneeId ? Number.parseInt(assigneeId, 10) : NaN;
    if (Number.isFinite(projectIdNum) && Number.isFinite(assigneeIdNum) && assigneeIdNum !== userId) {
      const membership = await projectMembersTable.findOne({
        userId,
        projectId: projectIdNum
      });
      if (membership) {
        query.assigneeId = assigneeIdNum;
        return query;
      }
    }
    if (scope === "created") {
      query.createdById = userId;
    } else {
      query.assigneeId = userId;
    }
    return query;
  }
  query.assigneeId = userId;
  return query;
}
async function getTasks(req, res) {
  const params = req.query;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const limit = Math.min(Number.parseInt(params.limit ?? "50", 10) || 50, 200);
  const skip = (page - 1) * limit;
  const query = await buildTaskListQuery(req.user.id, req.user.role, params);
  const [tasks, total] = await Promise.all([
    tasksTable.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    tasksTable.countDocuments(query)
  ]);
  const formatted = await Promise.all(tasks.map((t) => formatTask(t)));
  res.json({ tasks: formatted, total, page, limit });
}
async function postTasks(req, res) {
  const {
    projectId,
    title,
    description,
    assigneeId,
    status,
    priority,
    type,
    dueDate,
    labels
  } = req.body;
  if (!projectId || !title?.trim()) {
    badRequest("projectId and title are required.", !projectId ? "projectId" : "title");
  }
  const project = await projectsTable.findOne({ id: projectId });
  if (!project) notFound("Project");
  const resolvedAssigneeId = await resolveTaskAssignee(assigneeId, projectId);
  const taskId = await getNextSequence("tasks");
  const taskNumber = await generateTaskNumber();
  const initialStatus = status ?? (resolvedAssigneeId ? "todo" : "backlog");
  const task = await tasksTable.create({
    id: taskId,
    taskNumber,
    companyId: projectCompanyId(project),
    projectId,
    createdById: req.user.id,
    assigneeId: resolvedAssigneeId,
    title: title.trim(),
    description: description?.trim() ?? null,
    status: initialStatus,
    priority: priority ?? "normal",
    type: type ?? "task",
    dueDate: dueDate ?? null,
    labels: labels ?? [],
    completedAt: initialStatus === "done" ? /* @__PURE__ */ new Date() : null
  });
  if (resolvedAssigneeId) {
    await notifyAssignment({
      targetUserId: resolvedAssigneeId,
      actorId: req.user.id,
      actorName: req.user.name,
      title: "New task assigned",
      body: `${req.user.name} assigned you: ${task.title}`,
      type: "task",
      projectId,
      entityId: task.id
    });
  }
  res.status(201).json(await formatTask(task));
}
async function getTasksById(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const task = await tasksTable.findOne({ id });
  if (!task) notFound("Task");
  const role = req.user.role;
  const canView = role === "super_admin" || task.assigneeId === req.user.id || task.createdById === req.user.id;
  if (!canView) forbidden();
  res.json(await formatTask(task));
}
async function patchTasksById(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await tasksTable.findOne({ id });
  if (!existing) notFound("Task");
  const role = req.user.role;
  const isAdmin = role === "super_admin";
  const isAssignee = existing.assigneeId === req.user.id;
  if (!isAdmin && !isAssignee) forbidden();
  const body = req.body;
  const update = {};
  if (isAdmin) {
    if (body.title !== void 0) update.title = String(body.title).trim();
    if (body.description !== void 0) update.description = body.description || null;
    if (body.priority !== void 0) update.priority = body.priority;
    if (body.type !== void 0) update.type = body.type;
    if (body.dueDate !== void 0) update.dueDate = body.dueDate || null;
    if (body.labels !== void 0) update.labels = body.labels;
    if (body.status !== void 0) update.status = body.status;
    if (body.assigneeId !== void 0) {
      update.assigneeId = await resolveTaskAssignee(body.assigneeId, existing.projectId);
    }
  } else {
    if (body.status !== void 0) update.status = body.status;
    else badRequest("Assignees may only update task status.", "status");
  }
  if (update.status === "done") {
    update.completedAt = /* @__PURE__ */ new Date();
  } else if (update.status && update.status !== "done") {
    update.completedAt = null;
  }
  const updated = await tasksTable.findOneAndUpdate({ id }, { $set: update }, { new: true });
  if (!updated) notFound("Task");
  const newAssigneeId = update.assigneeId;
  if (isAdmin && newAssigneeId && newAssigneeId !== existing.assigneeId) {
    await notifyAssignment({
      targetUserId: newAssigneeId,
      actorId: req.user.id,
      actorName: req.user.name,
      title: "Task assigned to you",
      body: `${req.user.name} assigned you: ${updated.title}`,
      type: "task",
      projectId: updated.projectId,
      entityId: updated.id
    });
  }
  res.json(await formatTask(updated));
}
async function getProjectsByIdAssignableMembers(req, res) {
  const projectId = Number.parseInt(req.params.id, 10);
  const { for: assignFor } = req.query;
  const memberIds = await projectMembersTable.find({ projectId }).then(
    (rows) => rows.map((r) => r.userId)
  );
  const roleFilter = assignFor === "bug" ? ["developer"] : assignFor === "task" ? ["developer", "tester"] : ["developer", "tester"];
  const users = await usersTable.find({
    id: { $in: memberIds },
    role: { $in: roleFilter },
    status: "active"
  });
  res.json({
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      employeeId: u.employeeId,
      avatarUrl: u.avatarUrl ?? null
    }))
  });
}
export {
  getProjectsByIdAssignableMembers,
  getTasks,
  getTasksById,
  patchTasksById,
  postTasks
};
