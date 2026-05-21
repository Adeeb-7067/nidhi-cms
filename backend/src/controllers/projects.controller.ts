import type { Request, Response } from "express";
﻿import {
  projectsTable, projectMembersTable, apkSchedulesTable, milestonesTable,
  usersTable, clientsTable, dailyLogsTable, getNextSequence
} from "@/models/schema";
import { formatProject } from "@/services/project-format";
import { resolveCompanyIdFromBody, getProjectAccess } from "@/services/company-access";
import { paginateModel } from "@/lib/mongo-list";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "@/lib/route-errors";

// GET /api/projects
export async function getProjects(req: Request, res: Response) {
  const { status, type, clientId, companyId, search } = req.query as Record<string, string>;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const query: Record<string, any> = {};
  if (status) {
    if (status.includes(",")) {
      query.status = { $in: status.split(",") };
    } else if (status.startsWith("!")) {
      query.status = { $ne: status.substring(1) };
    } else {
      query.status = status;
    }
  }
  if (type) {
    if (type === "maintenance") {
      query.$or = [{ type: "maintenance" }, { status: "maintenance" }];
    } else {
      query.$or = [
        { type: "development"},
        { $and: [{ type: { $exists: false } }, { status: { $ne: "maintenance" } }] },
        { $and: [{ type: { $exists: true } }, { type: "development" }] }
      ];
    }
  }
  if (clientId) query.clientId = parseInt(clientId);
  if (search) query.name = { $regex: search, $options: "i" };

  if (req.user!.role === "developer" || req.user!.role === "tester") {
    const memberRows = await projectMembersTable.find({ userId: req.user!.id });
    const projectIds = memberRows.map((m) => m.projectId);
    if (!projectIds.length) {
      res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
      return;
    }
    query.id = { $in: projectIds };
  }

  if (req.user!.role === "client") {
    const clientRow = await clientsTable.findOne({ userId: req.user!.id });
    if (clientRow) {
      query.$or = [{ companyId: clientRow.id }, { clientId: clientRow.id }];
    }
  }

  const { items, total, page, limit } = await paginateModel(projectsTable, query, pagination);
  const includeTeam = req.user!.role === "super_admin";
  const formatted = await Promise.all(
    items.map((p) => formatProject(p as Parameters<typeof formatProject>[0], { includeTeam })),
  );
  res.json({ projects: formatted, total, page, limit });
}


// POST /api/projects
export async function postProjects(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  const name = optionalString(body.name);
  const resolvedCompanyId = resolveCompanyIdFromBody({
    companyId: body.companyId as number | undefined,
    clientId: body.clientId as number | undefined,
  });
  const priority = optionalString(body.priority);
  const startDate = optionalString(body.startDate);
  const deadline = optionalString(body.deadline);
  if (!name) badRequest("Project name is required.", "name");
  if (!resolvedCompanyId) badRequest("Company is required.", "companyId");
  if (!priority) badRequest("Priority is required.", "priority");
  if (!startDate) badRequest("Start date is required.", "startDate");
  if (!deadline) badRequest("Deadline is required.", "deadline");
  
  const nextId = await getNextSequence("projects");
  const project = await projectsTable.create({
    id: nextId,
    name,
    companyId: resolvedCompanyId,
    clientId: resolvedCompanyId,
    pmId: body.pmId != null ? Number(body.pmId) : null,
    description: optionalString(body.description) ?? null,
    status: optionalString(body.status) ?? "scoping",
    type: optionalString(body.type) ?? "development",
    priority,
    startDate: new Date(startDate),
    deadline: new Date(deadline),
    techStack: Array.isArray(body.techStack) ? body.techStack : [],
    figmaUrl: optionalString(body.figmaUrl) ?? null,
    repoUrl: optionalString(body.repoUrl) ?? null,
    stagingUrl: optionalString(body.stagingUrl) ?? null,
    productionUrl: optionalString(body.productionUrl) ?? null,
    adminUrl: optionalString(body.adminUrl) ?? null,
    websiteUrl: optionalString(body.websiteUrl) ?? null,
    postmanJson: body.postmanJson ?? null,
  });
  
  res.status(201).json(await formatProject(project));
}


// GET /api/projects/:id
export async function getProjectsById(req: Request, res: Response) {
  const id = parseInt(req.params['id'] as string);
  const project = await projectsTable.findOne({ id });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const access = await getProjectAccess(req, id);
  if (!access.allowed) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await formatProject(project));
}


// PATCH /api/projects/:id
export async function patchProjectsById(req: Request, res: Response) {
  const id = parseInt(req.params['id'] as string);
  const { name, pmId, description, status, type, priority, startDate, deadline, techStack, figmaUrl, repoUrl, stagingUrl, productionUrl, completionOverride, adminUrl, websiteUrl, postmanJson } = req.body;
  
  const project = await projectsTable.findOneAndUpdate(
    { id },
    { $set: {
        ...(name !== undefined && { name }),
        ...(pmId !== undefined && { pmId }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(techStack !== undefined && { techStack }),
        ...(figmaUrl !== undefined && { figmaUrl }),
        ...(repoUrl !== undefined && { repoUrl }),
        ...(stagingUrl !== undefined && { stagingUrl }),
        ...(productionUrl !== undefined && { productionUrl }),
        ...(adminUrl !== undefined && { adminUrl }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(postmanJson !== undefined && { postmanJson }),
        ...(completionOverride !== undefined && { completionOverride })
      }
    },
    { new: true }
  );
  
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await formatProject(project));
}


// DELETE /api/projects/:id
export async function deleteProjectsById(req: Request, res: Response) {
  const id = parseInt(req.params['id'] as string);
  await projectsTable.deleteOne({ id });
  // Cascading deletes
  await projectMembersTable.deleteMany({ projectId: id });
  await apkSchedulesTable.deleteMany({ projectId: id });
  await milestonesTable.deleteMany({ projectId: id });
  res.json({ message: "Project deleted" });
}


// GET /api/projects/:id/members
export async function getProjectsByIdMembers(req: Request, res: Response) {
  const projectId = parseInt(req.params['id'] as string);
  const members = await projectMembersTable.find({ projectId });
  
  const result = await Promise.all(
    members.map(async (m: any) => {
      const user = await usersTable.findOne({ id: m.userId });
      const lastLog = await dailyLogsTable
        .findOne({ developerId: m.userId, projectId: projectId })
        .sort({ logDate: -1 });
        
      return {
        id: m.id,
        userId: m.userId,
        subType: m.subType,
        completionPct: m.completionPct,
        joinedAt: m.joinedAt.toISOString(),
        name: user?.name ?? "Unknown",
        employeeId: user?.employeeId ?? null,
        designation: user?.designation ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        lastLogDate: lastLog?.logDate ?? null
      };
    }),
  );

  res.json(result);
}


// POST /api/projects/:id/members
export async function postProjectsByIdMembers(req: Request, res: Response) {
  const projectId = parseInt(req.params['id'] as string);
  const { userId, subType } = req.body as { userId: number; subType?: string };
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const uid = Number(userId);
  const existing = await projectMembersTable.findOne({ projectId, userId: uid });
  if (existing) {
    res.status(409).json({ error: "User is already assigned to this project" });
    return;
  }
  const nextId = await getNextSequence("project_members");
  await projectMembersTable.create({
    id: nextId,
    projectId,
    userId: uid,
    subType: subType ?? null,
    joinedAt: new Date(),
    completionPct: 0,
  });
  const user = await usersTable.findOne({ id: uid });
  res.status(201).json({
    id: nextId,
    userId: uid,
    projectId,
    subType: subType ?? null,
    name: user?.name ?? "Unknown",
    employeeId: user?.employeeId ?? null,
    designation: user?.designation ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    joinedAt: new Date().toISOString(),
    completionPct: 0,
    lastLogDate: null,
  });
}


// DELETE /api/projects/:id/members/:userId
export async function deleteProjectsByIdMembersByUserId(req: Request, res: Response) {
  const projectId = parseInt(req.params['id'] as string);
  const userId = parseInt(req.params['userId'] as string);
  await projectMembersTable.deleteOne({ projectId, userId });
  res.json({ message: "Member removed" });
}


// GET /api/projects/:id/apk-schedules
export async function getProjectsByIdApkSchedules(req: Request, res: Response) {
  const schedules = await apkSchedulesTable
    .find({ projectId: parseInt(req.params['id'] as string) })
    .sort({ scheduledDate: -1 });
  res.json(schedules.map((s: any) => ({
    id: s.id,
    projectId: s.projectId,
    scheduledDate: s.scheduledDate.toISOString(),
    label: s.label,
    audience: s.audience,
    createdAt: s.createdAt.toISOString()
  })));
}


// POST /api/projects/:id/apk-schedules
export async function postProjectsByIdApkSchedules(req: Request, res: Response) {
  const { scheduledDate, label, audience } = req.body as { scheduledDate: string; label: string; audience: "team_only" | "client_visible" };
  const nextId = await getNextSequence("apk_schedules");
  const schedule = await apkSchedulesTable.create({
    id: nextId,
    projectId: parseInt(req.params['id'] as string),
    scheduledDate: new Date(scheduledDate),
    label,
    audience
  });
  res.status(201).json({
    id: schedule.id,
    projectId: schedule.projectId,
    scheduledDate: schedule.scheduledDate.toISOString(),
    label: schedule.label,
    audience: schedule.audience,
    createdAt: schedule.createdAt.toISOString()
  });
}


// GET /api/projects/:id/milestones
export async function getProjectsByIdMilestones(req: Request, res: Response) {
  const milestones = await milestonesTable
    .find({ projectId: parseInt(req.params['id'] as string) })
    .sort({ plannedDate: 1 });
  res.json(milestones.map((m: any) => ({
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    plannedDate: m.plannedDate.toISOString(),
    actualDate: m.actualDate?.toISOString() ?? null,
    status: m.status,
    createdAt: m.createdAt.toISOString()
  })));
}


// POST /api/projects/:id/milestones
export async function postProjectsByIdMilestones(req: Request, res: Response) {
  const { title, plannedDate, status } = req.body as { title: string; plannedDate: string; status?: "pending" | "completed" | "delayed" };
  const nextId = await getNextSequence("milestones");
  const milestone = await milestonesTable.create({
    id: nextId,
    projectId: parseInt(req.params['id'] as string),
    title,
    plannedDate: new Date(plannedDate),
    status: status ?? "pending"
  });
  res.status(201).json({
    id: milestone.id,
    projectId: milestone.projectId,
    title: milestone.title,
    plannedDate: milestone.plannedDate.toISOString(),
    actualDate: null,
    status: milestone.status,
    createdAt: milestone.createdAt.toISOString()
  });
}


// GET /api/projects/:id/logs
export async function getProjectsByIdLogs(req: Request, res: Response) {
  const projectId = parseInt(req.params['id'] as string);
  const logs = await dailyLogsTable.find({ projectId }).sort({ logDate: -1 });
  const isClient = req.user?.role === "client";

  const formattedLogs = await Promise.all(
    logs.map(async (l: any) => {
      const user = await usersTable.findOne({ id: l.developerId });
      return {
        id: l.id,
        developerId: l.developerId,
        projectId: l.projectId,
        logDate: l.logDate,
        workCategories: l.workCategories,
        taskTitle: l.taskTitle,
        taskDescription: isClient ? "Detailed description restricted." : l.taskDescription,
        hoursSpent: Number(l.hoursSpent),
        completionPct: l.completionPct,
        blockers: isClient ? "Details restricted." : l.blockers,
        nextDayPlan: isClient ? "Details restricted." : l.nextDayPlan,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        developerName: user?.name ?? "Unknown",
        developerEmployeeId: user?.employeeId ?? null,
        projectName: ""
      };
    })
  );

  res.json({
    logs: formattedLogs,
    total: formattedLogs.length,
    page: 1,
    limit: formattedLogs.length,
  });
}


// GET /api/projects/:id/bugs
export async function getProjectsByIdBugs(req: Request, res: Response) {
  const { bugsTable } = await import("@/models/schema");
  const projectId = parseInt(req.params['id'] as string);
  const bugs = await bugsTable.find({ projectId }).sort({ createdAt: -1 });
  res.json({ bugs, total: bugs.length, page: 1, limit: bugs.length });
}


// GET /api/projects/:id/apk-releases
export async function getProjectsByIdApkReleases(req: Request, res: Response) {
  const { apkReleasesTable } = await import("@/models/schema");
  const projectId = parseInt(req.params['id'] as string);
  const releases = await apkReleasesTable.find({ projectId }).sort({ createdAt: -1 });
  res.json(releases.map((r: any) => ({
    id: r.id,
    projectId: r.projectId,
    uploaderId: r.uploaderId,
    version: r.version,
    buildNumber: r.buildNumber,
    releaseType: r.releaseType,
    changelog: r.changelog,
    platform: r.platform,
    minOsVersion: r.minOsVersion,
    fileUrl: r.fileUrl,
    audience: r.audience,
    apkScheduleId: r.apkScheduleId,
    createdAt: r.createdAt.toISOString()
  })));
}


// GET /api/projects/:id/history
export async function getProjectsByIdHistory(req: Request, res: Response) {
  const { auditLogsTable } = await import("@/models/schema");
  const projectId = parseInt(req.params['id'] as string);
  const history = await auditLogsTable.find({
    entityType: "projects",
    entityId: projectId
  }).sort({ createdAt: -1 });
  res.json(history);
}

