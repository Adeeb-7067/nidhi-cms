import { Router } from "express";
import {
  tasksTable,
  usersTable,
  projectsTable,
  projectMembersTable,
  getNextSequence,
} from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";
import { projectCompanyId } from "../lib/company-access";
import {
  notifyAssignment,
  resolveTaskAssignee,
} from "../lib/work-assignments";

const router = Router();

async function generateTaskNumber(): Promise<string> {
  const count = await getNextSequence("tasks_count");
  return `TASK-${String(count).padStart(4, "0")}`;
}

async function formatTask(task: {
  id: number;
  taskNumber: string;
  projectId: number;
  createdById: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  dueDate: string | null;
  labels: string[];
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}) {
  const [project, creator, assignee] = await Promise.all([
    projectsTable.findOne({ id: task.projectId }),
    usersTable.findOne({ id: task.createdById }),
    task.assigneeId ? usersTable.findOne({ id: task.assigneeId }) : null,
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
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

async function buildTaskListQuery(
  userId: number,
  role: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const query: Record<string, unknown> = {};
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
    if (
      Number.isFinite(projectIdNum) &&
      Number.isFinite(assigneeIdNum) &&
      assigneeIdNum !== userId
    ) {
      const membership = await projectMembersTable.findOne({
        userId,
        projectId: projectIdNum,
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

// GET /api/tasks
router.get("/tasks", requireAuth, async (req, res) => {
  const params = req.query as Record<string, string>;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const limit = Math.min(Number.parseInt(params.limit ?? "50", 10) || 50, 200);
  const skip = (page - 1) * limit;

  const query = await buildTaskListQuery(req.user!.id, req.user!.role, params);

  const [tasks, total] = await Promise.all([
    tasksTable.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    tasksTable.countDocuments(query),
  ]);

  const formatted = await Promise.all(tasks.map((t) => formatTask(t)));
  res.json({ tasks: formatted, total, page, limit });
});

// POST /api/tasks — super admin assigns work to dev / QA
router.post("/tasks", requireAuth, requireRole("super_admin"), async (req, res) => {
  const {
    projectId,
    title,
    description,
    assigneeId,
    status,
    priority,
    type,
    dueDate,
    labels,
  } = req.body as {
    projectId: number;
    title: string;
    description?: string;
    assigneeId?: number | null;
    status?: string;
    priority?: string;
    type?: string;
    dueDate?: string;
    labels?: string[];
  };

  if (!projectId || !title?.trim()) {
    res.status(400).json({ error: "projectId and title are required" });
    return;
  }

  const project = await projectsTable.findOne({ id: projectId });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  let resolvedAssigneeId: number | null = null;
  try {
    resolvedAssigneeId = await resolveTaskAssignee(assigneeId, projectId);
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 400;
    res.status(status).json({ error: err instanceof Error ? err.message : "Invalid assignee" });
    return;
  }

  const taskId = await getNextSequence("tasks");
  const taskNumber = await generateTaskNumber();
  const initialStatus = status ?? (resolvedAssigneeId ? "todo" : "backlog");

  const task = await tasksTable.create({
    id: taskId,
    taskNumber,
    companyId: projectCompanyId(project),
    projectId,
    createdById: req.user!.id,
    assigneeId: resolvedAssigneeId,
    title: title.trim(),
    description: description?.trim() ?? null,
    status: initialStatus,
    priority: priority ?? "normal",
    type: type ?? "task",
    dueDate: dueDate ?? null,
    labels: labels ?? [],
    completedAt: initialStatus === "done" ? new Date() : null,
  });

  if (resolvedAssigneeId) {
    await notifyAssignment({
      targetUserId: resolvedAssigneeId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      title: "New task assigned",
      body: `${req.user!.name} assigned you: ${task.title}`,
      type: "task",
      projectId,
      entityId: task.id,
    });
  }

  res.status(201).json(await formatTask(task));
});

// GET /api/tasks/:id
router.get("/tasks/:id", requireAuth, async (req, res) => {
  const id = Number.parseInt(req.params.id as string, 10);
  const task = await tasksTable.findOne({ id });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const role = req.user!.role;
  const canView =
    role === "super_admin" ||
    task.assigneeId === req.user!.id ||
    task.createdById === req.user!.id;

  if (!canView) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(await formatTask(task));
});

// PATCH /api/tasks/:id
router.patch("/tasks/:id", requireAuth, async (req, res) => {
  const id = Number.parseInt(req.params.id as string, 10);
  const existing = await tasksTable.findOne({ id });
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const role = req.user!.role;
  const isAdmin = role === "super_admin";
  const isAssignee = existing.assigneeId === req.user!.id;

  if (!isAdmin && !isAssignee) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (isAdmin) {
    if (body.title !== undefined) update.title = String(body.title).trim();
    if (body.description !== undefined) update.description = body.description || null;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.type !== undefined) update.type = body.type;
    if (body.dueDate !== undefined) update.dueDate = body.dueDate || null;
    if (body.labels !== undefined) update.labels = body.labels;
    if (body.status !== undefined) update.status = body.status;
    if (body.assigneeId !== undefined) {
      try {
        update.assigneeId = await resolveTaskAssignee(
          body.assigneeId as number | null,
          existing.projectId,
        );
      } catch (err) {
        const status = (err as Error & { status?: number }).status ?? 400;
        res.status(status).json({ error: err instanceof Error ? err.message : "Invalid assignee" });
        return;
      }
    }
  } else {
    if (body.status !== undefined) update.status = body.status;
    else {
      res.status(400).json({ error: "Assignees may only update task status" });
      return;
    }
  }

  if (update.status === "done") {
    update.completedAt = new Date();
  } else if (update.status && update.status !== "done") {
    update.completedAt = null;
  }

  const updated = await tasksTable.findOneAndUpdate({ id }, { $set: update }, { new: true });
  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const newAssigneeId = update.assigneeId as number | null | undefined;
  if (isAdmin && newAssigneeId && newAssigneeId !== existing.assigneeId) {
    await notifyAssignment({
      targetUserId: newAssigneeId as number,
      actorId: req.user!.id,
      actorName: req.user!.name,
      title: "Task assigned to you",
      body: `${req.user!.name} assigned you: ${updated.title}`,
      type: "task",
      projectId: updated.projectId,
      entityId: updated.id,
    });
  }

  res.json(await formatTask(updated));
});

// GET /api/projects/:id/assignable-members — devs + QA on a project
router.get("/projects/:id/assignable-members", requireAuth, async (req, res) => {
  const projectId = Number.parseInt(req.params.id as string, 10);
  const { for: assignFor } = req.query as { for?: string };

  const memberIds = await projectMembersTable.find({ projectId }).then((rows) =>
    rows.map((r) => r.userId),
  );

  const roleFilter =
    assignFor === "bug"
      ? ["developer"]
      : assignFor === "task"
        ? ["developer", "tester"]
        : ["developer", "tester"];

  const users = await usersTable.find({
    id: { $in: memberIds },
    role: { $in: roleFilter },
    status: "active",
  });

  res.json({
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      employeeId: u.employeeId,
      avatarUrl: u.avatarUrl ?? null,
    })),
  });
});

export default router;
