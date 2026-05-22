import {
  projectsTable,
  projectMembersTable,
  apkSchedulesTable,
  milestonesTable,
  usersTable,
  clientsTable,
  dailyLogsTable,
  getNextSequence
} from "@/models/schema";
import { formatProject } from "@/mappers/project-format";
import { resolveCompanyIdFromBody, getProjectAccess } from "@/services/access/company-access";
import { paginateModel } from "@/utils/mongo-list";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  parsePagination,
  optionalString
} from "@/utils/route-errors";
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
  if (req.user.role === "developer" || req.user.role === "tester") {
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
  const formatted = await Promise.all(
    items.map((p) => formatProject(p, { includeTeam }))
  );
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
  const { name, pmId, description, status, type, priority, startDate, deadline, techStack, figmaUrl, repoUrl, stagingUrl, productionUrl, completionOverride, adminUrl, websiteUrl, postmanJson } = req.body;
  const project = await projectsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        ...name !== void 0 && { name },
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
  const projectId = parseInt(req.params["id"]);
  const members = await projectMembersTable.find({ projectId });
  const result = await Promise.all(
    members.map(async (m) => {
      const user = await usersTable.findOne({ id: m.userId });
      const lastLog = await dailyLogsTable.findOne({ developerId: m.userId, projectId }).sort({ logDate: -1 });
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
    })
  );
  res.json(result);
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
    joinedAt: (/* @__PURE__ */ new Date()).toISOString(),
    completionPct: 0,
    lastLogDate: null
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
  const logs = await dailyLogsTable.find({ projectId }).sort({ logDate: -1 });
  const isClient = req.user?.role === "client";
  const formattedLogs = await Promise.all(
    logs.map(async (l) => {
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
    limit: formattedLogs.length
  });
}
async function getProjectsByIdBugs(req, res) {
  const { bugsTable } = await import("@/models/schema");
  const projectId = parseInt(req.params["id"]);
  const bugs = await bugsTable.find({ projectId }).sort({ createdAt: -1 });
  res.json({ bugs, total: bugs.length, page: 1, limit: bugs.length });
}
async function getProjectsByIdApkReleases(req, res) {
  const { apkReleasesTable } = await import("@/models/schema");
  const projectId = parseInt(req.params["id"]);
  const releases = await apkReleasesTable.find({ projectId }).sort({ createdAt: -1 });
  res.json(releases.map((r) => ({
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
async function getProjectsByIdHistory(req, res) {
  const { auditLogsTable } = await import("@/models/schema");
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
  postProjectsByIdMilestones
};
