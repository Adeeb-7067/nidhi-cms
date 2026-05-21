import type { Request, Response } from "express";
﻿import {
  bugsTable,
  usersTable,
  projectsTable,
  projectMembersTable,
  getNextSequence,
} from "@/models/schema";
import { validateStoredFileUrl } from "@/lib/file-storage";
import { projectCompanyId } from "@/services/company-access";
import {
  notifyAssignment,
  resolveBugAssignee,
} from "@/services/work-assignments";
import { formatBugRow, formatBugRows } from "@/services/bug-format";
import { paginateModel } from "@/lib/mongo-list";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "@/lib/route-errors";

async function generateBugNumber(): Promise<string> {
  const count = await getNextSequence("bugs_count");
  return `BUG-${String(count).padStart(4, "0")}`;
}

async function buildBugListQuery(
  userId: number,
  role: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const query: Record<string, unknown> = {};
  const { projectId, status, severity, assigneeId, scope } = params;

  if (projectId) query.projectId = Number.parseInt(projectId, 10);
  if (status) query.status = status;
  if (severity) query.severity = severity;

  if (role === "super_admin") {
    if (assigneeId) query.assigneeId = Number.parseInt(assigneeId, 10);
    if (scope === "unassigned") query.assigneeId = null;
    if (scope === "mine") query.assigneeId = userId;
    return query;
  }

  if (role === "developer") {
    query.assigneeId = userId;
    return query;
  }

  if (role === "tester") {
    const memberships = await projectMembersTable.find({ userId }, { projectId: 1 });
    const projectIds = memberships.map((m) => m.projectId);
    if (scope === "mine") {
      query.$or = [{ assigneeId: userId }, { reporterId: userId }];
    } else if (projectIds.length > 0) {
      query.$or = [{ projectId: { $in: projectIds } }, { reporterId: userId }];
    } else {
      query.reporterId = userId;
    }
    return query;
  }

  query.reporterId = userId;
  return query;
}

// GET /api/bugs
export async function getBugs(req: Request, res: Response) {
  const params = req.query as Record<string, string>;
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const query = await buildBugListQuery(req.user!.id, req.user!.role, params);

  const { items, total, page, limit } = await paginateModel(bugsTable, query, pagination);
  const bugs = await formatBugRows(items as Parameters<typeof formatBugRows>[0]);

  res.json({ bugs, total, page, limit });
}


// POST /api/bugs ΓÇö team members can file issues; QA/admin can assign on create
export async function postBugs(req: Request, res: Response) {
  const {
    projectId,
    title,
    description,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    severity,
    priority,
    buildVersion,
    platform,
    assigneeId,
    attachmentUrl,
  } = req.body;

  if (!projectId || !title || !severity || !priority || !platform) {
    res.status(400).json({ error: "projectId, title, severity, priority, platform required" });
    return;
  }

  try {
    validateStoredFileUrl(attachmentUrl, "attachmentUrl");
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid attachmentUrl" });
    return;
  }

  let resolvedAssigneeId: number | null = null;
  try {
    resolvedAssigneeId = await resolveBugAssignee(assigneeId, projectId);
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 400;
    res.status(status).json({ error: err instanceof Error ? err.message : "Invalid assignee" });
    return;
  }

  const project = await projectsTable.findOne({ id: projectId });
  const bugId = await getNextSequence("bugs");
  const bugNumber = await generateBugNumber();

  const bug = await bugsTable.create({
    id: bugId,
    bugNumber,
    companyId: project ? projectCompanyId(project) : null,
    projectId,
    reporterId: req.user!.id,
    title,
    description: description ?? null,
    stepsToReproduce: stepsToReproduce ?? null,
    expectedBehavior: expectedBehavior ?? null,
    actualBehavior: actualBehavior ?? null,
    severity,
    priority,
    platform,
    buildVersion: buildVersion ?? null,
    assigneeId: resolvedAssigneeId,
    attachmentUrl: attachmentUrl ?? null,
    status: resolvedAssigneeId ? "in_progress" : "open",
  });

  if (resolvedAssigneeId) {
    await notifyAssignment({
      targetUserId: resolvedAssigneeId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      title: "Bug assigned to you",
      body: `${req.user!.name} assigned ${bug.bugNumber}: ${bug.title}`,
      type: "bug",
      projectId,
      entityId: bug.id,
    });
  }

  res.status(201).json(await formatBugRow(bug));
}


// GET /api/bugs/:id
export async function getBugsById(req: Request, res: Response) {
  const bug = await bugsTable.findOne({ id: Number.parseInt(req.params.id as string, 10) });
  if (!bug) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }
  res.json(await formatBugRow(bug));
}


// PATCH /api/bugs/:id
export async function patchBugsById(req: Request, res: Response) {
  const id = Number.parseInt(req.params.id as string, 10);
  const existing = await bugsTable.findOne({ id });
  if (!existing) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }

  const role = req.user!.role;
  const isQaOrAdmin = role === "tester" || role === "super_admin";
  const isAssigneeDev = role === "developer" && existing.assigneeId === req.user!.id;

  if (!isQaOrAdmin && !isAssigneeDev) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const {
    title,
    description,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    severity,
    priority,
    status,
    buildVersion,
    platform,
    assigneeId,
    attachmentUrl,
  } = req.body;

  if (!isQaOrAdmin) {
    const updateObj: Record<string, unknown> = {};
    if (status !== undefined) updateObj.status = status;
    if (Object.keys(updateObj).length === 0) {
      res.status(400).json({ error: "Developers may only update status" });
      return;
    }
    if (status === "fixed" || status === "wont_fix" || status === "duplicate") {
      updateObj.resolvedAt = new Date();
    }
    const updated = await bugsTable.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
    if (!updated) {
      res.status(404).json({ error: "Bug not found" });
      return;
    }
    res.json(await formatBugRow(updated));
    return;
  }

  try {
    validateStoredFileUrl(attachmentUrl, "attachmentUrl");
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid attachmentUrl" });
    return;
  }

  const updateObj: Record<string, unknown> = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(stepsToReproduce !== undefined && { stepsToReproduce }),
    ...(expectedBehavior !== undefined && { expectedBehavior }),
    ...(actualBehavior !== undefined && { actualBehavior }),
    ...(severity !== undefined && { severity }),
    ...(priority !== undefined && { priority }),
    ...(status !== undefined && { status }),
    ...(buildVersion !== undefined && { buildVersion }),
    ...(platform !== undefined && { platform }),
    ...(attachmentUrl !== undefined && { attachmentUrl }),
  };

  if (assigneeId !== undefined) {
    try {
      updateObj.assigneeId = await resolveBugAssignee(assigneeId, existing.projectId);
      if (updateObj.assigneeId && !status) {
        updateObj.status = existing.status === "open" ? "in_progress" : existing.status;
      }
    } catch (err) {
      const httpStatus = (err as Error & { status?: number }).status ?? 400;
      res.status(httpStatus).json({ error: err instanceof Error ? err.message : "Invalid assignee" });
      return;
    }
  }

  if (status === "fixed" || status === "wont_fix" || status === "duplicate") {
    updateObj.resolvedAt = new Date();
  }

  const updated = await bugsTable.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
  if (!updated) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }

  const newAssignee = updateObj.assigneeId as number | null | undefined;
  if (newAssignee && newAssignee !== existing.assigneeId) {
    await notifyAssignment({
      targetUserId: newAssignee,
      actorId: req.user!.id,
      actorName: req.user!.name,
      title: "Bug assigned to you",
      body: `${req.user!.name} assigned ${updated.bugNumber}: ${updated.title}`,
      type: "bug",
      projectId: updated.projectId,
      entityId: updated.id,
    });
  }

  res.json(await formatBugRow(updated));
}


// PATCH /api/bugs/:id/assign ΓÇö QA / admin quick assign to developer
export async function patchBugsByIdAssign(req: Request, res: Response) {
  const id = Number.parseInt(req.params.id as string, 10);
  const { assigneeId } = req.body as { assigneeId?: number | null };

  const existing = await bugsTable.findOne({ id });
  if (!existing) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }

  let resolvedAssigneeId: number | null;
  try {
    resolvedAssigneeId = await resolveBugAssignee(assigneeId, existing.projectId);
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 400;
    res.status(status).json({ error: err instanceof Error ? err.message : "Invalid assignee" });
    return;
  }

  const updated = await bugsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        assigneeId: resolvedAssigneeId,
        status: resolvedAssigneeId
          ? existing.status === "open"
            ? "in_progress"
            : existing.status
          : "open",
      },
    },
    { new: true },
  );

  if (!updated) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }

  if (resolvedAssigneeId && resolvedAssigneeId !== existing.assigneeId) {
    await notifyAssignment({
      targetUserId: resolvedAssigneeId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      title: "Bug assigned to you",
      body: `${req.user!.name} assigned ${updated.bugNumber}: ${updated.title}`,
      type: "bug",
      projectId: updated.projectId,
      entityId: updated.id,
    });
  }

  res.json(await formatBugRow(updated));
}

