import { isDevPortalStaffRole } from "../../../constants/user-roles.js";
import {
  projectsTable,
  projectMembersTable,
  apkSchedulesTable,
  milestonesTable,
  usersTable,
  clientsTable,
  clientTeamMembersTable,
  dailyLogsTable,
  getNextSequence
} from "../../../models/schema/index.js";
import {
  ensureDigitalAccountForProject,
  softDeleteDigitalAccountForProject,
  getScopedDigitalUserAccess,
} from "../../marketing/services/helpers.js";
import { formatProject, formatProjectList } from "../../../mappers/project-format.js";
import { validateStoredFileUrl } from "../../../lib/file-storage.js";
import {
  normalizeDigitalServices,
  normalizeSocialLinks,
  deriveDigitalPlatforms,
} from "../../../utils/digital-project-fields.js";
import { attachPresenceToUser } from "../../monitoring/services/presence.js";
import { toIso } from "../../../utils/mongo-list.js";
import { resolveCompanyIdFromBody, getProjectAccess } from "../../access/services/company-access.js";
import { assertProjectAccess } from "../../access/services/access-helpers.js";
import { getAccessibleProjectIds, applyIdScope } from "../../access/services/list-scope.js";
import { assertClientPermission, findClientCompanyForUser } from "../../identity/services/client-team.js";
import { bdeOwnsCustomer, findBdeOwnedCustomerIds } from "../../../utils/sales-bde-customer-scope.js";
import { canManageCmsProjects } from "../../../middlewares/digital-access.js";
import { evictPermissionCache } from "../../identity/services/permissions.service.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { resolveLogProjectName } from "../../work/services/daily-log-virtual-projects.js";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  parsePagination,
  optionalString
} from "../../../utils/route-errors.js";
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
    } else if (type === "digital") {
      query.type = "digital";
    } else {
      // development — include legacy rows with no type; exclude digital + maintenance
      query.$and = [
        {
          $or: [
            { type: "development" },
            {
              $and: [
                { $or: [{ type: { $exists: false } }, { type: null }] },
                { status: { $ne: "maintenance" } },
              ],
            },
          ],
        },
        { type: { $ne: "digital" } },
      ];
    }
  }
  if (clientId) query.clientId = parseInt(clientId);
  if (search) query.name = { $regex: search, $options: "i" };

  // Row scope: only super_admin / finance see all projects.
  // Digital, delivery, bde, client, hr → membership / company / digital access.
  if (req.user.role !== "super_admin" && req.user.role !== "finance") {
    // Prefer existing branches for clarity, then default-deny via helper.
    if (req.user.role === "digital") {
      const access = await getScopedDigitalUserAccess(req.user);
      if (!access.projectIds.length) {
        res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
        return;
      }
      query.id = { $in: access.projectIds };
    } else if (req.user.role === "bde") {
      const memberRows = await projectMembersTable.find({ userId: req.user.id }).select({ projectId: 1 }).lean();
      const memberIds = memberRows.map((m) => m.projectId);
      const ownedCompanyIds = await findBdeOwnedCustomerIds(clientsTable, req.user.id);
      const ownedProjects = ownedCompanyIds.length
        ? await projectsTable
            .find({
              isDeleted: { $ne: true },
              $or: [
                { companyId: { $in: ownedCompanyIds } },
                { clientId: { $in: ownedCompanyIds } },
              ],
            })
            .select({ id: 1 })
            .lean()
        : [];
      const projectIds = [...new Set([...memberIds, ...ownedProjects.map((p) => p.id)])];
      if (!projectIds.length) {
        res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
        return;
      }
      query.id = { $in: projectIds };
    } else if (isDevPortalStaffRole(req.user.role)) {
      const memberRows = await projectMembersTable.find({ userId: req.user.id });
      const projectIds = memberRows.map((m) => m.projectId);
      if (!projectIds.length) {
        res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
        return;
      }
      query.id = { $in: projectIds };
    } else if (req.user.role === "client") {
      const clientRow = await findClientCompanyForUser(req.user.id);
      if (!clientRow) {
        res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
        return;
      }
      const companyScope = {
        $or: [{ companyId: clientRow.id }, { clientId: clientRow.id }],
      };
      if (query.$or || query.$and) {
        const existing = { ...query };
        const keys = Object.keys(existing);
        for (const k of keys) delete query[k];
        query.$and = [existing, companyScope];
      } else {
        Object.assign(query, companyScope);
      }
    } else {
      // hr and any other role: membership only (empty if not a member)
      const ids = await getAccessibleProjectIds(req.user);
      if (!applyIdScope(query, "id", ids)) {
        res.json({ projects: [], total: 0, page: pagination.page, limit: pagination.limit });
        return;
      }
    }
  }
  const { items, total, page, limit } = await paginateModel(projectsTable, query, pagination);
  const wantPicker =
    req.query.picker === "1" ||
    req.query.picker === "true" ||
    req.query.fields === "picker" ||
    req.user.role === "finance";
  if (wantPicker) {
    res.json({
      projects: items.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        type: p.type ?? null,
        companyId: p.companyId ?? p.clientId ?? null,
        clientId: p.clientId ?? p.companyId ?? null,
      })),
      total,
      page,
      limit,
    });
    return;
  }
  const formatted = await formatProjectList(items, { includeTeam: true });
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
  if (req.user.role === "bde") {
    const client = await clientsTable.findOne({ id: resolvedCompanyId }).lean();
    if (!client || !bdeOwnsCustomer(client, req.user.id)) {
      forbidden("You can only create projects for your own customers.");
    }
  }
  const requestedType = optionalString(body.type) ?? "development";
  if (req.user.role === "digital" && requestedType !== "digital") {
    badRequest("Digital specialists can only create digital projects.", "type");
  }
  const projectType = req.user.role === "digital" ? "digital" : requestedType;
  const logoUrl = optionalString(body.logoUrl);
  if (logoUrl) validateStoredFileUrl(logoUrl, "logoUrl");
  const digitalServices =
    projectType === "digital" ? normalizeDigitalServices(body.digitalServices) : {};
  const socialLinks =
    projectType === "digital" ? normalizeSocialLinks(body.socialLinks) : {};
  const rawTechStack = Array.isArray(body.techStack) ? body.techStack : [];
  const techStack =
    projectType === "digital"
      ? deriveDigitalPlatforms(digitalServices, socialLinks, rawTechStack)
      : rawTechStack;
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
    type: projectType,
    priority,
    startDate: new Date(startDate),
    deadline: new Date(deadline),
    techStack,
    digitalServices,
    socialLinks,
    figmaUrl: optionalString(body.figmaUrl) ?? null,
    repoUrl: optionalString(body.repoUrl) ?? null,
    stagingUrl: optionalString(body.stagingUrl) ?? null,
    productionUrl: optionalString(body.productionUrl) ?? null,
    adminUrl: optionalString(body.adminUrl) ?? null,
    websiteUrl: optionalString(body.websiteUrl) ?? null,
    postmanJson: body.postmanJson ?? null
  });
  if (req.user.role === "bde" || req.user.role === "digital") {
    const memberId = await getNextSequence("project_members");
    await projectMembersTable.create({
      id: memberId,
      projectId: nextId,
      userId: req.user.id,
      subType: null,
      joinedAt: new Date(),
      completionPct: 0
    });
  }
  if (projectType === "digital") {
    try {
      await ensureDigitalAccountForProject(
        project.toObject ? project.toObject() : project,
        req.user.id,
      );
    } catch (err) {
      console.error("[projects] ensureDigitalAccountForProject failed:", err?.message ?? err);
      // Surface as 500 so create isn't "success" without a Media vault
      throw err;
    }
  }
  res.status(201).json(await formatProject(project));
}
async function getProjectsById(req, res) {
  const id = parseInt(req.params["id"]);
  const project = await projectsTable.findOne({ id });
  if (!project) notFound("Project");
  const access = await getProjectAccess(req, id);
  if (!access.allowed) forbidden();
  await assertClientPermission(req, "overview", "view");
  res.json(await formatProject(project));
}
async function patchProjectsById(req, res) {
  const id = parseInt(req.params["id"]);
  const {
    name,
    pmId,
    description,
    status,
    type,
    priority,
    startDate,
    deadline,
    techStack,
    digitalServices,
    socialLinks,
    figmaUrl,
    repoUrl,
    stagingUrl,
    productionUrl,
    completionOverride,
    adminUrl,
    websiteUrl,
    postmanJson,
    logoUrl,
  } = req.body;
  if (req.user.role !== "super_admin") {
    await assertProjectAccess(req, id, { needManage: true });
  }
  if (req.user.role === "digital") {
    const existing = await projectsTable.findOne({ id }).select({ type: 1 }).lean();
    if (!existing) notFound("Project");
    if (existing.type !== "digital") {
      forbidden("Digital specialists can only update digital projects.");
    }
    if (type !== undefined && type !== "digital") {
      badRequest("Digital specialists cannot change project type away from digital.", "type");
    }
  }
  if (logoUrl !== void 0) {
    const normalized = optionalString(logoUrl);
    if (normalized) validateStoredFileUrl(normalized, "logoUrl");
  }

  const existingForMerge = await projectsTable
    .findOne({ id })
    .select({ type: 1, digitalServices: 1, socialLinks: 1, techStack: 1 })
    .lean();
  if (!existingForMerge) notFound("Project");

  const nextType = type !== void 0 ? type : existingForMerge.type;
  const patch = {
    ...name !== void 0 && { name },
    ...logoUrl !== void 0 && { logoUrl: optionalString(logoUrl) ?? null },
    ...pmId !== void 0 && { pmId },
    ...description !== void 0 && { description },
    ...status !== void 0 && { status },
    ...type !== void 0 && { type },
    ...priority !== void 0 && { priority },
    ...startDate !== void 0 && { startDate: new Date(startDate) },
    ...deadline !== void 0 && { deadline: new Date(deadline) },
    ...figmaUrl !== void 0 && { figmaUrl },
    ...repoUrl !== void 0 && { repoUrl },
    ...stagingUrl !== void 0 && { stagingUrl },
    ...productionUrl !== void 0 && { productionUrl },
    ...adminUrl !== void 0 && { adminUrl },
    ...websiteUrl !== void 0 && { websiteUrl },
    ...postmanJson !== void 0 && { postmanJson },
    ...completionOverride !== void 0 && { completionOverride },
  };

  if (nextType === "digital") {
    const nextServices =
      digitalServices !== void 0
        ? normalizeDigitalServices(digitalServices)
        : normalizeDigitalServices(existingForMerge.digitalServices);
    const nextLinks =
      socialLinks !== void 0
        ? normalizeSocialLinks(socialLinks)
        : normalizeSocialLinks(existingForMerge.socialLinks);
    if (digitalServices !== void 0) patch.digitalServices = nextServices;
    if (socialLinks !== void 0) patch.socialLinks = nextLinks;
    const baseStack =
      techStack !== void 0
        ? Array.isArray(techStack)
          ? techStack
          : []
        : existingForMerge.techStack ?? [];
    if (
      techStack !== void 0 ||
      digitalServices !== void 0 ||
      socialLinks !== void 0
    ) {
      patch.techStack = deriveDigitalPlatforms(nextServices, nextLinks, baseStack);
    }
  } else {
    if (techStack !== void 0) patch.techStack = techStack;
    if (digitalServices !== void 0) patch.digitalServices = {};
    if (socialLinks !== void 0) patch.socialLinks = {};
  }

  const project = await projectsTable.findOneAndUpdate(
    { id },
    { $set: patch },
    { new: true }
  );
  if (!project) notFound("Project");
  if (project.type === "digital") {
    try {
      await ensureDigitalAccountForProject(
        project.toObject ? project.toObject() : project,
        req.user.id,
      );
    } catch (err) {
      console.warn("[projects] ensureDigitalAccountForProject:", err?.message ?? err);
    }
  } else if (type !== undefined && type !== "digital") {
    try {
      await softDeleteDigitalAccountForProject(id);
    } catch (err) {
      console.warn("[projects] softDeleteDigitalAccountForProject:", err?.message ?? err);
    }
  }
  res.json(await formatProject(project));
}
async function deleteProjectsById(req, res) {
  const id = parseInt(req.params["id"]);
  if (req.user.role !== "super_admin") {
    await assertProjectAccess(req, id, { needManage: true });
  }
  if (req.user.role === "digital") {
    const existing = await projectsTable.findOne({ id }).select({ type: 1 }).lean();
    if (!existing) notFound("Project");
    if (existing.type !== "digital") {
      forbidden("Digital specialists can only delete digital projects.");
    }
  }
  await projectsTable.deleteOne({ id });
  await projectMembersTable.deleteMany({ projectId: id });
  await apkSchedulesTable.deleteMany({ projectId: id });
  await milestonesTable.deleteMany({ projectId: id });
  try {
    await softDeleteDigitalAccountForProject(id);
  } catch (err) {
    console.warn("[projects] softDeleteDigitalAccountForProject:", err?.message ?? err);
  }
  res.json({ message: "Project deleted" });
}
async function getProjectsByIdMembers(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  const access = await getProjectAccess(req, projectId);
  if (!access.allowed) forbidden();
  await assertClientPermission(req, "developers", "view");
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

/** super_admin/hr/manager: any; digital AM: digital + membership; bde: owned/member projects. */
async function assertCanManageProjectMembers(req, projectId) {
  const role = req.user?.role;
  if (role === "super_admin" || role === "hr") return;
  if (!canManageCmsProjects(req.user)) {
    forbidden("You cannot manage project members.");
  }
  if (role === "manager") return;

  const project = await projectsTable
    .findOne({ id: projectId })
    .select({ type: 1, companyId: 1, clientId: 1 })
    .lean();
  if (!project) notFound("Project");

  if (role === "digital") {
    if (project.type !== "digital") {
      forbidden("Digital specialists can only manage team on digital projects.");
    }
    const access = await getScopedDigitalUserAccess(req.user);
    if (!(access.projectIds ?? []).includes(Number(projectId))) {
      forbidden("You can only manage team on digital projects you are assigned to.");
    }
    return;
  }

  if (role === "bde") {
    const access = await getProjectAccess(req, projectId);
    if (!access.allowed) forbidden("You cannot manage project members.");
    return;
  }

  forbidden("You cannot manage project members.");
}

async function postProjectsByIdMembers(req, res) {
  const projectId = parseInt(req.params["id"]);
  await assertCanManageProjectMembers(req, projectId);
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
  evictPermissionCache(uid);
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
  await assertCanManageProjectMembers(req, projectId);
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
      evictPermissionCache(uid);
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
  await assertCanManageProjectMembers(req, projectId);
  const userId = parseInt(req.params["userId"]);
  await projectMembersTable.deleteOne({ projectId, userId });
  evictPermissionCache(userId);
  res.json({ message: "Member removed" });
}

async function patchProjectsByIdMembersByUserId(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  await assertCanManageProjectMembers(req, projectId);
  const userId = parseInt(req.params["userId"], 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    badRequest("userId is required.", "userId");
  }

  if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, "subType")) {
    badRequest("subType is required.", "subType");
  }
  const subType = optionalString(req.body.subType);

  const member = await projectMembersTable
    .findOneAndUpdate(
      { projectId, userId },
      { $set: { subType: subType || null } },
      { new: true },
    )
    .lean();
  if (!member) notFound("Project member");

  evictPermissionCache(userId);
  const user = await usersTable.findOne({ id: userId }).lean();
  res.json(formatMemberResponse(member, user));
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
async function formatMilestones(milestones, projectId) {
  const assigneeIds = [...new Set(milestones.map((m) => m.assigneeId).filter(Boolean))];
  const [memberRows, users] = await Promise.all([
    assigneeIds.length
      ? projectMembersTable.find({ projectId, userId: { $in: assigneeIds } }).lean().exec()
      : [],
    assigneeIds.length
      ? usersTable
          .find({ id: { $in: assigneeIds } })
          .select({ id: 1, name: 1, avatarUrl: 1, designation: 1, employeeId: 1 })
          .lean()
          .exec()
      : [],
  ]);
  const subTypeByUser = new Map(memberRows.map((m) => [m.userId, m.subType]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return milestones.map((m) => {
    const assignee = m.assigneeId ? userById.get(m.assigneeId) : null;
    return {
      id: m.id,
      projectId: m.projectId,
      title: m.title,
      plannedDate: m.plannedDate.toISOString(),
      actualDate: m.actualDate?.toISOString() ?? null,
      status: m.status,
      assigneeId: m.assigneeId ?? null,
      assigneeName: assignee?.name ?? null,
      assigneeAvatarUrl: assignee?.avatarUrl ?? null,
      assigneeRole: m.assigneeId
        ? (subTypeByUser.get(m.assigneeId) ?? assignee?.designation ?? null)
        : null,
      createdAt: m.createdAt.toISOString(),
    };
  });
}

async function resolveMilestoneAssigneeId(projectId, assigneeId) {
  if (assigneeId == null || assigneeId === "") return null;
  const resolved = Number(assigneeId);
  const member = await projectMembersTable.findOne({ projectId, userId: resolved }).lean();
  if (!member) badRequest("Assignee must be a member of this project.", "assigneeId");
  return resolved;
}

async function getProjectsByIdMilestones(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  await assertClientPermission(req, "milestones", "view");
  const milestones = await milestonesTable.find({ projectId }).sort({ plannedDate: 1 }).lean().exec();
  res.json(await formatMilestones(milestones, projectId));
}
async function postProjectsByIdMilestones(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  const { title, plannedDate, status, assigneeId } = req.body ?? {};
  if (!title) badRequest("title is required.", "title");
  if (!plannedDate) badRequest("plannedDate is required.", "plannedDate");

  let resolvedAssigneeId = null;
  if (assigneeId != null && assigneeId !== "") {
    resolvedAssigneeId = await resolveMilestoneAssigneeId(projectId, assigneeId);
  }

  const nextId = await getNextSequence("milestones");
  const milestone = await milestonesTable.create({
    id: nextId,
    projectId,
    title,
    plannedDate: new Date(plannedDate),
    status: status ?? "pending",
    assigneeId: resolvedAssigneeId,
  });
  const [formatted] = await formatMilestones([milestone.toObject()], projectId);
  res.status(201).json(formatted);
}

async function patchProjectsByIdMilestonesByMilestoneId(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  const milestoneId = parseInt(req.params["milestoneId"], 10);
  const existing = await milestonesTable.findOne({ id: milestoneId, projectId }).lean();
  if (!existing) notFound("Milestone");

  const { title, plannedDate, status, assigneeId } = req.body ?? {};
  const updates = {};

  if (title !== undefined) {
    if (!String(title).trim()) badRequest("title cannot be empty.", "title");
    updates.title = String(title).trim();
  }
  if (plannedDate !== undefined) {
    if (!plannedDate) badRequest("plannedDate is required.", "plannedDate");
    updates.plannedDate = new Date(plannedDate);
  }
  if (status !== undefined) {
    updates.status = status;
    if (status === "completed" && !existing.actualDate) {
      updates.actualDate = new Date();
    }
  }
  if (assigneeId !== undefined) {
    updates.assigneeId = await resolveMilestoneAssigneeId(projectId, assigneeId);
  }

  if (!Object.keys(updates).length) badRequest("No valid fields to update.");

  const milestone = await milestonesTable.findOneAndUpdate(
    { id: milestoneId, projectId },
    { $set: updates },
    { new: true },
  ).lean();
  if (!milestone) notFound("Milestone");

  const [formatted] = await formatMilestones([milestone], projectId);
  res.json(formatted);
}

async function getProjectsByIdLogs(req, res) {
  const projectId = parseInt(req.params["id"]);
  // Daily logs are the "recent activity / progress" feed on the client
  // portal, so gate them on the `progress` section.
  await assertClientPermission(req, "progress", "view");
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
  const { bugsTable } = await import("../../../models/schema/index.js");
  const { formatBugList } = await import("../../../mappers/bug-format.js");
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
  await assertClientPermission(req, "overview", "view");
  const { apkReleasesTable } = await import("../../../models/schema/index.js");
  const { buildApkReleaseListFilter, formatApkReleaseRow } = await import("../../work/services/apk-access.js");
  const { IdLookupCache } = await import("../../../lib/lookup-cache.js");
  const { usersTable } = await import("../../../models/schema/index.js");
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
  const { auditLogsTable } = await import("../../../models/schema/index.js");
  const projectId = parseInt(req.params["id"]);
  const history = await auditLogsTable.find({
    entityType: "projects",
    entityId: projectId
  }).sort({ createdAt: -1 });
  res.json(history);
}
async function getProjectsByIdClientTeam(req, res) {
  const id = parseInt(req.params["id"], 10);
  const project = await projectsTable.findOne({ id }).lean();
  if (!project) notFound("Project");
  const access = await getProjectAccess(req, id);
  if (!access.allowed) forbidden();

  const companyId = project.companyId || project.clientId;
  if (!companyId) {
    res.json({ primaryContact: null, members: [] });
    return;
  }

  const [clientRow, teamMembers] = await Promise.all([
    clientsTable.findOne({ id: companyId }, { id: 1, userId: 1, contactPerson: 1, email: 1, phone: 1 }).lean(),
    clientTeamMembersTable.find({ clientCompanyId: companyId, status: { $ne: "inactive" } }).lean(),
  ]);

  const memberUserIds = teamMembers.map((m) => m.userId);
  const allUserIds = [...new Set([
    ...(clientRow?.userId ? [clientRow.userId] : []),
    ...memberUserIds,
  ])];

  const users = allUserIds.length
    ? await usersTable.find({ id: { $in: allUserIds } }, { id: 1, name: 1, email: 1, avatarUrl: 1 }).lean()
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const primaryContact = clientRow?.userId
    ? {
        userId: clientRow.userId,
        name: userById.get(clientRow.userId)?.name ?? clientRow.contactPerson ?? null,
        email: userById.get(clientRow.userId)?.email ?? clientRow.email ?? null,
        avatarUrl: userById.get(clientRow.userId)?.avatarUrl ?? null,
        title: "Client Admin",
        isAdmin: true,
        status: "active",
      }
    : null;

  const members = teamMembers.map((m) => {
    const user = userById.get(m.userId);
    return {
      userId: m.userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      title: m.title ?? null,
      isAdmin: false,
      status: m.status,
    };
  });

  res.json({ primaryContact, members });
}
export {
  deleteProjectsById,
  deleteProjectsByIdMembersByUserId,
  getProjects,
  getProjectsById,
  getProjectsByIdApkReleases,
  getProjectsByIdApkSchedules,
  getProjectsByIdBugs,
  getProjectsByIdClientTeam,
  getProjectsByIdHistory,
  getProjectsByIdLogs,
  getProjectsByIdMembers,
  getProjectsByIdMilestones,
  patchProjectsById,
  patchProjectsByIdMembersByUserId,
  patchProjectsByIdMilestonesByMilestoneId,
  postProjects,
  postProjectsByIdApkSchedules,
  postProjectsByIdMembers,
  postProjectsByIdMembersBatch,
  postProjectsByIdMilestones,
};
