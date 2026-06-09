import {
  projectsTable,
  projectMembersTable,
  apkSchedulesTable,
  milestonesTable,
  usersTable,
  clientsTable,
  dailyLogsTable,
  getNextSequence
} from "../models/schema/index.js";
import { formatProject, formatProjectList } from "../mappers/project-format.js";
import { validateStoredFileUrl } from "../lib/file-storage.js";
import { attachPresenceToUser } from "../services/presence.js";
import { toIso } from "../utils/mongo-list.js";
import { resolveCompanyIdFromBody, getProjectAccess } from "../services/access/company-access.js";
import { assertProjectAccess } from "../services/access/access-helpers.js";
import { paginateModel } from "../utils/mongo-list.js";
import { resolveLogProjectName } from "../services/daily-log-virtual-projects.js";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  parsePagination,
  optionalString
} from "../utils/route-errors.js";
async function getProjects(req, res) {
  const { status, type, clientId, companyId, search } = req.query;
  const pagination = parsePagination(req.query);
  const query = {};
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
        { type: "development" },
        { $and: [{ type: { $exists: false } }, { status: { $ne: "maintenance" } }] },
        { $and: [{ type: { $exists: true } }, { type: "development" }] }
      ];
    }
  }
  if (clientId) query.clientId = parseInt(clientId);
  if (search) query.name = { $regex: search, $options: "i" };
  if (req.user.role === "developer" || req.user.role === "tester" || req.user.role === "qa") {
    const memberRows = await projectMembersTable.find({ userId: req.user.id });
    const projectIds = memberRows.map((m) => m.projectId);
    if (!projectIds.length) {
      res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
      return;
    }
    query.id = { $in: projectIds };
  }
  if (req.user.role === "client") {
    const clientRow = await clientsTable.findOne({ userId: req.user.id });
    if (clientRow) {
      query.$or = [{ companyId: clientRow.id }, { clientId: clientRow.id }];
    }
  }
  const { items, total, page, limit } = await paginateModel(projectsTable, query, pagination);
  const includeTeam = req.user.role === "super_admin";
  const formatted = await formatProjectList(items, { includeTeam });
  res.json({ projects: formatted, total, page, limit });
}
async function postProjects(req, res) {
  const body = req.body;
  const name = optionalString(body.name);
  const resolvedCompanyId = resolveCompanyIdFromBody({
    companyId: body.companyId,
    clientId: body.clientId
  });
  const priority = optionalString(body.priority);
  const startDate = optionalString(body.startDate);
  const deadline = optionalString(body.deadline);
  if (!name) badRequest("Project name is required.", "name");
  if (!resolvedCompanyId) badRequest("Company is required.", "companyId");
  if (!priority) badRequest("Priority is required.", "priority");
  if (!startDate) badRequest("Start date is required.", "startDate");
  if (!deadline) badRequest("Deadline is required.", "deadline");
  const logoUrl = optionalString(body.logoUrl);
  if (logoUrl) validateStoredFileUrl(logoUrl, "logoUrl");
  const nextId = await getNextSequence("projects");
  const project = await projectsTable.create({
    id: nextId,
    name,
    logoUrl: logoUrl ?? null,
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
    postmanJson: body.postmanJson ?? null
  });
  res.status(201).json(await formatProject(project));
}
async function getProjectsById(req, res) {
  const id = parseInt(req.params["id"]);
  const project = await projectsTable.findOne({ id });
  if (!project) notFound("Project");
  const access = await getProjectAccess(req, id);
  if (!access.allowed) forbidden();
  res.json(await formatProject(project));
}
async function patchProjectsById(req, res) {
  const id = parseInt(req.params["id"]);
  const { name, pmId, description, status, type, priority, startDate, deadline, techStack, figmaUrl, repoUrl, stagingUrl, productionUrl, completionOverride, adminUrl, websiteUrl, postmanJson, logoUrl } = req.body;
  if (logoUrl !== void 0) {
    const normalized = optionalString(logoUrl);
    if (normalized) validateStoredFileUrl(normalized, "logoUrl");
  }
  const project = await projectsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        ...name !== void 0 && { name },
        ...logoUrl !== void 0 && { logoUrl: optionalString(logoUrl) ?? null },
        ...pmId !== void 0 && { pmId },
        ...description !== void 0 && { description },
        ...status !== void 0 && { status },
        ...type !== void 0 && { type },
        ...priority !== void 0 && { priority },
        ...startDate !== void 0 && { startDate: new Date(startDate) },
        ...deadline !== void 0 && { deadline: new Date(deadline) },
        ...techStack !== void 0 && { techStack },
        ...figmaUrl !== void 0 && { figmaUrl },
        ...repoUrl !== void 0 && { repoUrl },
        ...stagingUrl !== void 0 && { stagingUrl },
        ...productionUrl !== void 0 && { productionUrl },
        ...adminUrl !== void 0 && { adminUrl },
        ...websiteUrl !== void 0 && { websiteUrl },
        ...postmanJson !== void 0 && { postmanJson },
        ...completionOverride !== void 0 && { completionOverride }
      }
    },
    { new: true }
  );
  if (!project) notFound("Project");
  res.json(await formatProject(project));
}
async function deleteProjectsById(req, res) {
  const id = parseInt(req.params["id"]);
  await projectsTable.deleteOne({ id });
  await projectMembersTable.deleteMany({ projectId: id });
  await apkSchedulesTable.deleteMany({ projectId: id });
  await milestonesTable.deleteMany({ projectId: id });
  res.json({ message: "Project deleted" });
}
async function getProjectsByIdMembers(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  const members = await projectMembersTable.find({ projectId }).lean().exec();
  if (!members.length) {
    res.json([]);
    return;
  }

  const userIds = members.map((m) => m.userId);
  const [users, lastLogRows] = await Promise.all([
    usersTable
      .find(
        { id: { $in: userIds } },
        {
          id: 1,
          name: 1,
          employeeId: 1,
          designation: 1,
          avatarUrl: 1,
          lastLoginAt: 1,
          lastSeenAt: 1,
        },
      )
      .lean()
      .exec(),
    dailyLogsTable
      .aggregate([
        { $match: { projectId, developerId: { $in: userIds } } },
        { $sort: { logDate: -1 } },
        { $group: { _id: "$developerId", logDate: { $first: "$logDate" } } },
      ])
      .exec(),
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const lastLogByUser = new Map(lastLogRows.map((r) => [r._id, r.logDate]));

  const result = members.map((m) => {
    const user = userById.get(m.userId);
    const base = {
      id: m.id,
      userId: m.userId,
      subType: m.subType,
      completionPct: m.completionPct,
      joinedAt: m.joinedAt.toISOString(),
      name: user?.name ?? "Unknown",
      employeeId: user?.employeeId ?? null,
      designation: user?.designation ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      lastLogDate: lastLogByUser.get(m.userId) ?? null,
      lastLoginAt: toIso(user?.lastLoginAt),
      lastSeenAt: toIso(user?.lastSeenAt),
    };
    const presence = attachPresenceToUser({
      id: m.userId,
      lastLoginAt: base.lastLoginAt,
      lastSeenAt: base.lastSeenAt,
    });
    return {
      ...base,
      presenceStatus: presence.presenceStatus,
      isActiveNow: presence.isActiveNow,
      lastSeenAt: presence.lastSeenAt,
      lastActivityAt: presence.lastActivityAt,
    };
  });

  res.json(result);
}

function formatMemberResponse(m, user, lastLogDate = null) {
  return {
    id: m.id,
    userId: m.userId,
    projectId: m.projectId,
    subType: m.subType ?? null,
    name: user?.name ?? "Unknown",
    employeeId: user?.employeeId ?? null,
    designation: user?.designation ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    joinedAt: m.joinedAt.toISOString(),
    completionPct: m.completionPct ?? 0,
    lastLogDate,
  };
}
async function postProjectsByIdMembers(req, res) {
  const projectId = parseInt(req.params["id"]);
  const { userId, subType } = req.body;
  if (!userId) badRequest("userId is required.", "userId");
  const uid = Number(userId);
  const existing = await projectMembersTable.findOne({ projectId, userId: uid });
  if (existing) {
    conflict("User is already assigned to this project.", "userId");
  }
  const nextId = await getNextSequence("project_members");
  await projectMembersTable.create({
    id: nextId,
    projectId,
    userId: uid,
    subType: subType ?? null,
    joinedAt: /* @__PURE__ */ new Date(),
    completionPct: 0
  });
  const user = await usersTable.findOne({ id: uid }).lean();
  const member = {
    id: nextId,
    projectId,
    userId: uid,
    subType: subType ?? null,
    joinedAt: new Date(),
    completionPct: 0,
  };
  res.status(201).json(formatMemberResponse(member, user));
}

async function postProjectsByIdMembersBatch(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  const rawIds = req.body.userIds;
  const subType = optionalString(req.body.subType) ?? null;

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    badRequest("userIds array is required.", "userIds");
  }
  if (rawIds.length > 50) {
    badRequest("Maximum 50 members per request.", "userIds");
  }

  const userIds = [...new Set(rawIds.map((id) => Number.parseInt(String(id), 10)).filter(Boolean))];
  const existing = await projectMembersTable
    .find({ projectId, userId: { $in: userIds } }, { userId: 1 })
    .lean()
    .exec();
  const existingSet = new Set(existing.map((e) => e.userId));

  const toAdd = userIds.filter((uid) => !existingSet.has(uid));
  const added = [];
  const skipped = userIds.filter((uid) => existingSet.has(uid)).map((userId) => ({ userId }));

  if (toAdd.length) {
    const users = await usersTable
      .find({ id: { $in: toAdd }, status: "active" }, { id: 1, name: 1, employeeId: 1, designation: 1, avatarUrl: 1 })
      .lean()
      .exec();
    const userById = new Map(users.map((u) => [u.id, u]));
    const joinedAt = new Date();

    for (const uid of toAdd) {
      if (!userById.has(uid)) {
        skipped.push({ userId: uid, reason: "User not found or inactive" });
        continue;
      }
      const nextId = await getNextSequence("project_members");
      const member = {
        id: nextId,
        projectId,
        userId: uid,
        subType,
        joinedAt,
        completionPct: 0,
      };
      await projectMembersTable.create(member);
      added.push(formatMemberResponse(member, userById.get(uid)));
    }
  }

  res.status(201).json({
    added,
    skipped,
    addedCount: added.length,
    skippedCount: skipped.length,
  });
}
async function deleteProjectsByIdMembersByUserId(req, res) {
  const projectId = parseInt(req.params["id"]);
  const userId = parseInt(req.params["userId"]);
  await projectMembersTable.deleteOne({ projectId, userId });
  res.json({ message: "Member removed" });
}
async function getProjectsByIdApkSchedules(req, res) {
  const schedules = await apkSchedulesTable.find({ projectId: parseInt(req.params["id"]) }).sort({ scheduledDate: -1 });
  res.json(schedules.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    scheduledDate: s.scheduledDate.toISOString(),
    label: s.label,
    audience: s.audience,
    createdAt: s.createdAt.toISOString()
  })));
}
async function postProjectsByIdApkSchedules(req, res) {
  const { scheduledDate, label, audience } = req.body;
  const nextId = await getNextSequence("apk_schedules");
  const schedule = await apkSchedulesTable.create({
    id: nextId,
    projectId: parseInt(req.params["id"]),
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
async function getProjectsByIdMilestones(req, res) {
  const milestones = await milestonesTable.find({ projectId: parseInt(req.params["id"]) }).sort({ plannedDate: 1 });
  res.json(milestones.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    plannedDate: m.plannedDate.toISOString(),
    actualDate: m.actualDate?.toISOString() ?? null,
    status: m.status,
    createdAt: m.createdAt.toISOString()
  })));
}
async function postProjectsByIdMilestones(req, res) {
  const { title, plannedDate, status } = req.body;
  const nextId = await getNextSequence("milestones");
  const milestone = await milestonesTable.create({
    id: nextId,
    projectId: parseInt(req.params["id"]),
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
async function getProjectsByIdLogs(req, res) {
  const projectId = parseInt(req.params["id"]);
  const project = await projectsTable.findOne({ id: projectId }, { id: 1, name: 1 }).lean();
  const logs = await dailyLogsTable.find({ projectId }).sort({ logDate: -1 }).lean();
  const isClient = req.user?.role === "client";
  const developerIds = [...new Set(logs.map((l) => l.developerId).filter(Boolean))];
  const developers = developerIds.length
    ? await usersTable
        .find({ id: { $in: developerIds } })
        .select({ id: 1, name: 1, employeeId: 1 })
        .lean()
    : [];
  const developerById = new Map(developers.map((u) => [u.id, u]));
  const formattedLogs = logs.map((l) => {
    const user = developerById.get(l.developerId);
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
      projectName: resolveLogProjectName(projectId, project),
    };
  });
  res.json({
    logs: formattedLogs,
    total: formattedLogs.length,
    page: 1,
    limit: formattedLogs.length
  });
}
async function getProjectsByIdBugs(req, res) {
  const { bugsTable } = await import("../models/schema/index.js");
  const { formatBugList } = await import("../mappers/bug-format.js");
  const projectId = parseInt(req.params["id"]);
  const items = await bugsTable
    .find({
      projectId,
      $or: [{ parentBugId: null }, { parentBugId: { $exists: false } }],
    })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  const bugs = await formatBugList(items);
  res.json({ bugs, total: bugs.length, page: 1, limit: bugs.length });
}
async function getProjectsByIdApkReleases(req, res) {
  const { apkReleasesTable } = await import("../models/schema/index.js");
  const { buildApkReleaseListFilter, formatApkReleaseRow } = await import("../services/apk-access.js");
  const { IdLookupCache } = await import("../lib/lookup-cache.js");
  const { usersTable } = await import("../models/schema/index.js");
  const projectId = parseInt(req.params["id"]);
  await assertProjectAccess(req, projectId);
  const releases = await apkReleasesTable
    .find({ projectId, ...buildApkReleaseListFilter(req.user) })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  const uploaders = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec(),
  );
  await uploaders.preload(releases.map((r) => r.uploaderId));
  res.json(
    releases.map((r) =>
      formatApkReleaseRow(r, uploaders.get(r.uploaderId)?.name ?? "Unknown"),
    ),
  );
}
async function getProjectsByIdHistory(req, res) {
  const { auditLogsTable } = await import("../models/schema/index.js");
  const projectId = parseInt(req.params["id"]);
  const history = await auditLogsTable.find({
    entityType: "projects",
    entityId: projectId
  }).sort({ createdAt: -1 });
  res.json(history);
}
export {
  deleteProjectsById,
  deleteProjectsByIdMembersByUserId,
  getProjects,
  getProjectsById,
  getProjectsByIdApkReleases,
  getProjectsByIdApkSchedules,
  getProjectsByIdBugs,
  getProjectsByIdHistory,
  getProjectsByIdLogs,
  getProjectsByIdMembers,
  getProjectsByIdMilestones,
  patchProjectsById,
  postProjects,
  postProjectsByIdApkSchedules,
  postProjectsByIdMembers,
  postProjectsByIdMembersBatch,
  postProjectsByIdMilestones,
};
