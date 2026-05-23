import {
  bugsTable,
  projectsTable,
  projectMembersTable,
  commentsTable,
  getNextSequence,
} from "../models/schema/index.js";
import { validateStoredFileUrl } from "../lib/file-storage.js";
import { projectCompanyId } from "../services/access/company-access.js";
import {
  notifyAssignment,
  resolveBugAssignee,
  resolveBugAssignees,
} from "../services/work-assignments.js";
import {
  deriveLegacyStatus,
  normalizeFinalStatus,
  normalizeIssueInput,
  normalizeTrackStatus,
  rollupFromIssues,
  canSetDevStatus,
  canSetFinalStatus,
  canSetQaStatus,
  defaultTrackFields,
  resolveListStatusFilter,
  normalizeBugStatus,
  BUG_STATUSES,
} from "../services/bugs/bug-workflow.js";
import { formatBugList, formatBugRow } from "../mappers/bug-format.js";
import { paginateModel } from "../utils/mongo-list.js";
import {
  parsePagination,
  badRequest,
  forbidden,
  notFound,
} from "../utils/route-errors.js";

async function generateBugNumber() {
  const count = await getNextSequence("bugs_count");
  return `BUG-${String(count).padStart(4, "0")}`;
}

function parseAssigneeIdsParam(assigneeId) {
  if (assigneeId == null || assigneeId === "") return null;
  return Number.parseInt(String(assigneeId), 10);
}

/** Merge a constraint without clobbering existing $or / flat fields. */
function mergeAndClause(query, clause) {
  if (!clause || Object.keys(clause).length === 0) return query;
  const prevAnd = query.$and ? [...query.$and] : [];
  const flat = { ...query };
  delete flat.$and;
  const parts = [...prevAnd];
  if (Object.keys(flat).length > 0) parts.push(flat);
  parts.push(clause);
  for (const key of Object.keys(query)) delete query[key];
  query.$and = parts;
  return query;
}

function applyStatusFilter(query, status) {
  const statusFilter = resolveListStatusFilter(status);
  if (!statusFilter) return query;
  if (typeof statusFilter === "string") {
    query.status = statusFilter;
    return query;
  }
  return mergeAndClause(query, statusFilter);
}

/** One list row per report — skip legacy separate child documents. */
function withListableBugsOnly(query) {
  return mergeAndClause(query, {
    $or: [{ parentBugId: null }, { parentBugId: { $exists: false } }],
  });
}

async function buildBugListQuery(userId, role, params) {
  const query = {};
  const { projectId, status, severity, assigneeId, scope } = params;
  if (projectId) query.projectId = Number.parseInt(projectId, 10);
  applyStatusFilter(query, status);
  if (severity) query.severity = severity;

  if (role === "super_admin") {
    const aid = parseAssigneeIdsParam(assigneeId);
    if (aid) {
      mergeAndClause(query, { $or: [{ assigneeId: aid }, { assigneeIds: aid }] });
    }
    if (scope === "unassigned") {
      mergeAndClause(query, {
        $and: [
          { $or: [{ assigneeId: null }, { assigneeId: { $exists: false } }] },
          { $or: [{ assigneeIds: { $size: 0 } }, { assigneeIds: { $exists: false } }] },
        ],
      });
    }
    if (scope === "mine") {
      mergeAndClause(query, { $or: [{ assigneeId: userId }, { assigneeIds: userId }] });
    }
    return withListableBugsOnly(query);
  }

  if (role === "developer") {
    mergeAndClause(query, { $or: [{ assigneeId: userId }, { assigneeIds: userId }] });
    return withListableBugsOnly(query);
  }

  if (role === "tester" || role === "qa") {
    const memberships = await projectMembersTable.find({ userId }, { projectId: 1 });
    const projectIds = memberships.map((m) => m.projectId);
    const defaultToOwnReports =
      role === "qa" && scope !== "all" && scope !== "mine" && scope !== "unassigned";

    if (scope === "created" || defaultToOwnReports) {
      query.reporterId = userId;
      return withListableBugsOnly(query);
    }
    if (scope === "mine") {
      mergeAndClause(query, {
        $or: [{ assigneeId: userId }, { assigneeIds: userId }, { reporterId: userId }],
      });
      return withListableBugsOnly(query);
    }
    if (scope === "unassigned") {
      mergeAndClause(query, {
        $and: [
          { $or: [{ assigneeId: null }, { assigneeId: { $exists: false } }] },
          { assigneeIds: { $size: 0 } },
        ],
      });
      if (projectIds.length > 0) query.projectId = { $in: projectIds };
      return withListableBugsOnly(query);
    }
    if (projectIds.length > 0) {
      mergeAndClause(query, { $or: [{ projectId: { $in: projectIds } }, { reporterId: userId }] });
    } else {
      query.reporterId = userId;
    }
    return withListableBugsOnly(query);
  }

  query.reporterId = userId;
  return withListableBugsOnly(query);
}

async function assertCanViewBug(user, bug) {
  const role = user.role;
  if (role === "super_admin") return;
  if (role === "developer") {
    const assigned =
      bug.assigneeId === user.id ||
      (Array.isArray(bug.assigneeIds) && bug.assigneeIds.includes(user.id));
    if (assigned) return;
    if (bug.parentBugId) {
      const parent = await bugsTable.findOne({ id: bug.parentBugId });
      if (parent) {
        await assertCanViewBug(user, parent);
        return;
      }
    }
    forbidden();
    return;
  }
  if (role === "tester" || role === "qa") {
    if (bug.reporterId === user.id) return;
    const member = await projectMembersTable.findOne({ projectId: bug.projectId, userId: user.id });
    if (member) return;
    forbidden();
    return;
  }
  if (bug.reporterId !== user.id) forbidden();
}

function normalizeAttachmentsInput(attachments, attachmentUrl, userId) {
  const list = [];
  if (Array.isArray(attachments)) {
    for (const item of attachments) {
      if (!item?.url) continue;
      validateStoredFileUrl(item.url, "attachments");
      list.push({
        url: item.url,
        name: item.name ?? null,
        mimeType: item.mimeType ?? null,
        uploadedBy: userId,
      });
    }
  }
  if (attachmentUrl) {
    validateStoredFileUrl(attachmentUrl, "attachmentUrl");
    if (!list.some((a) => a.url === attachmentUrl)) {
      list.push({
        url: attachmentUrl,
        name: null,
        mimeType: null,
        uploadedBy: userId,
      });
    }
  }
  return list;
}

async function createInitialComment(userId, bugId, content) {
  if (!content?.trim()) return;
  const nextId = await getNextSequence("comments");
  await commentsTable.create({
    id: nextId,
    authorId: userId,
    threadType: "bug",
    threadId: bugId,
    content: content.trim(),
    parentId: null,
  });
}

async function notifyNewAssignees(assigneeIds, existingIds, actor, bug, projectId) {
  const prev = new Set(existingIds ?? []);
  for (const targetUserId of assigneeIds) {
    if (prev.has(targetUserId) || targetUserId === actor.id) continue;
    await notifyAssignment({
      targetUserId,
      actorId: actor.id,
      actorName: actor.name,
      title: "Bug assigned to you",
      body: `${actor.name} assigned ${bug.bugNumber}: ${bug.title}`,
      type: "bug",
      projectId,
      entityId: bug.id,
    });
  }
}

async function getBugs(req, res) {
  const params = req.query;
  const pagination = parsePagination(req.query);
  const query = await buildBugListQuery(req.user.id, req.user.role, params);
  const { items, total, page, limit } = await paginateModel(bugsTable, query, pagination);
  const bugs = await formatBugList(items);
  res.json({ bugs, total, page, limit });
}

function buildTrackPayload(bugLike, resolvedAssignees) {
  const track = {
    qaStatus: normalizeTrackStatus(bugLike.qaStatus),
    devStatus: normalizeTrackStatus(bugLike.devStatus),
    finalStatus: normalizeFinalStatus(bugLike.finalStatus),
  };
  const status = deriveLegacyStatus({ ...bugLike, assigneeIds: resolvedAssignees, ...track });
  const resolvedAt = track.finalStatus === "resolved" ? new Date() : null;
  return { ...track, status, resolvedAt };
}

async function insertBugRecord({
  project,
  user,
  title,
  description,
  priority,
  rawAssigneeIds,
  attachmentList,
  severity,
  platform,
  issues,
  qaStatus,
  devStatus,
  finalStatus,
}) {
  const resolvedAssignees = await resolveBugAssignees(rawAssigneeIds, project.id);
  const embedded = Array.isArray(issues) ? issues.map(normalizeIssueInput).filter((i) => i.title) : [];
  const trackSource =
    embedded.length > 0
      ? rollupFromIssues(embedded)
      : {
          qaStatus: qaStatus ?? "open",
          devStatus: devStatus ?? "open",
          finalStatus: finalStatus ?? "open",
        };
  const track = buildTrackPayload(
    { assigneeIds: resolvedAssignees, ...trackSource },
    resolvedAssignees,
  );

  const bugId = await getNextSequence("bugs");
  const bugNumber = await generateBugNumber();

  const bug = await bugsTable.create({
    id: bugId,
    bugNumber,
    companyId: project ? projectCompanyId(project) : null,
    projectId: project.id,
    reporterId: user.id,
    assigneeIds: resolvedAssignees,
    assigneeId: resolvedAssignees[0] ?? null,
    title,
    description: description ?? null,
    severity: severity ?? "medium",
    priority,
    platform: platform ?? "web",
    attachments: attachmentList,
    attachmentUrl: attachmentList[0]?.url ?? null,
    issues: embedded,
    ...track,
    stepsToReproduce: null,
    expectedBehavior: null,
    actualBehavior: null,
    buildVersion: null,
    parentBugId: null,
  });

  return { bug, resolvedAssignees };
}

async function postBugs(req, res) {
  const {
    projectId,
    title,
    description,
    priority,
    status,
    assigneeId,
    assigneeIds,
    attachmentUrl,
    attachments,
    initialComment,
    severity,
    platform,
  } = req.body;

  if (!projectId || !title || !priority) {
    badRequest("projectId, title, and priority are required.");
  }

  const project = await projectsTable.findOne({ id: Number(projectId) });
  if (!project) notFound("Project");

  const role = req.user.role;
  const canCreate = ["developer", "tester", "qa", "super_admin"].includes(role);
  if (!canCreate) forbidden();

  const rawAssigneeIds = Array.isArray(assigneeIds)
    ? assigneeIds
    : assigneeId != null
      ? [assigneeId]
      : [];
  const attachmentList = normalizeAttachmentsInput(attachments, attachmentUrl, req.user.id);

  const { bug, resolvedAssignees } = await insertBugRecord({
    project,
    user: req.user,
    title,
    description,
    priority,
    rawAssigneeIds,
    attachmentList,
    severity,
    platform,
    qaStatus: req.body.qaStatus,
    devStatus: req.body.devStatus,
    finalStatus: req.body.finalStatus,
    issues: [],
  });

  await createInitialComment(req.user.id, bug.id, initialComment);
  await notifyNewAssignees(resolvedAssignees, [], req.user, bug, bug.projectId);

  res.status(201).json(await formatBugRow(bug));
}

async function postBugsBatch(req, res) {
  const {
    projectId,
    priority,
    assigneeId,
    assigneeIds,
    attachmentUrl,
    attachments,
    initialComment,
    description,
    parentTitle,
    items,
    severity,
    platform,
  } = req.body;

  if (!projectId || !priority || !Array.isArray(items) || items.length < 2) {
    badRequest("projectId, priority, and at least 2 items are required for a batch.");
  }

  const project = await projectsTable.findOne({ id: Number(projectId) });
  if (!project) notFound("Project");

  const role = req.user.role;
  if (!["developer", "tester", "qa", "super_admin"].includes(role)) forbidden();

  const rawAssigneeIds = Array.isArray(assigneeIds)
    ? assigneeIds
    : assigneeId != null
      ? [assigneeId]
      : [];
  const attachmentList = normalizeAttachmentsInput(attachments, attachmentUrl, req.user.id);

  const embeddedIssues = items
    .map((item) => normalizeIssueInput(item))
    .filter((item) => item.title);
  if (embeddedIssues.length < 2) {
    badRequest("Each batch item needs a title.", "items");
  }

  const batchTitle =
    String(parentTitle ?? "").trim() ||
    `${embeddedIssues[0].title} (+${embeddedIssues.length - 1} more)`;

  const { bug, resolvedAssignees } = await insertBugRecord({
    project,
    user: req.user,
    title: batchTitle,
    description: description ?? null,
    priority,
    rawAssigneeIds,
    attachmentList,
    severity,
    platform,
    issues: embeddedIssues,
  });

  await createInitialComment(req.user.id, bug.id, initialComment);
  await notifyNewAssignees(resolvedAssignees, [], req.user, bug, bug.projectId);

  res.status(201).json(await formatBugRow(bug));
}

async function getBugsById(req, res) {
  const bug = await bugsTable.findOne({ id: Number.parseInt(req.params.id, 10) });
  if (!bug) notFound("Bug");
  await assertCanViewBug(req.user, bug);
  res.json(await formatBugRow(bug));
}

async function patchBugsById(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await bugsTable.findOne({ id });
  if (!existing) notFound("Bug");
  await assertCanViewBug(req.user, existing);

  const role = req.user.role;
  const isQaOrAdmin = role === "tester" || role === "qa" || role === "super_admin";
  const isAssigneeDev =
    role === "developer" &&
    (existing.assigneeId === req.user.id ||
      (Array.isArray(existing.assigneeIds) && existing.assigneeIds.includes(req.user.id)));

  if (!isQaOrAdmin && !isAssigneeDev) forbidden();

  const {
    title,
    description,
    priority,
    assigneeId,
    assigneeIds,
    attachmentUrl,
    attachments,
    severity,
    platform,
    qaStatus,
    devStatus,
    finalStatus,
    issueKey,
  } = req.body;

  const isAssignee =
    existing.assigneeId === req.user.id ||
    (Array.isArray(existing.assigneeIds) && existing.assigneeIds.includes(req.user.id));

  const updateObj = {};

  if (issueKey && Array.isArray(existing.issues) && existing.issues.length > 0) {
    const issues = existing.issues.map((i) => ({ ...i.toObject?.() ?? i }));
    const idx = issues.findIndex((i) => i.key === issueKey);
    if (idx < 0) notFound("Issue");

    if (qaStatus !== undefined) {
      if (!canSetQaStatus(role)) forbidden();
      issues[idx].qaStatus = normalizeTrackStatus(qaStatus);
    }
    if (devStatus !== undefined) {
      if (!canSetDevStatus(role, isAssignee)) forbidden();
      issues[idx].devStatus = normalizeTrackStatus(devStatus);
    }
    if (finalStatus !== undefined) {
      if (!canSetFinalStatus(role)) forbidden();
      issues[idx].finalStatus = normalizeFinalStatus(finalStatus);
    }

    updateObj.issues = issues;
    const rollup = rollupFromIssues(issues);
    Object.assign(updateObj, buildTrackPayload({ ...existing, ...rollup }, existing.assigneeIds));
  } else {
    if (qaStatus !== undefined) {
      if (!canSetQaStatus(role)) forbidden();
      updateObj.qaStatus = normalizeTrackStatus(qaStatus);
    }
    if (devStatus !== undefined) {
      if (!canSetDevStatus(role, isAssignee)) forbidden();
      updateObj.devStatus = normalizeTrackStatus(devStatus);
    }
    if (finalStatus !== undefined) {
      if (!canSetFinalStatus(role)) forbidden();
      updateObj.finalStatus = normalizeFinalStatus(finalStatus);
    }

    if (!isQaOrAdmin) {
      if (
        qaStatus === undefined &&
        devStatus === undefined &&
        finalStatus === undefined &&
        attachments === undefined &&
        attachmentUrl === undefined
      ) {
        badRequest("Developers may only update dev status or attachments.");
      }
      if (title !== undefined || description !== undefined || priority !== undefined) forbidden();
    } else {
      if (title !== undefined) updateObj.title = title;
      if (description !== undefined) updateObj.description = description;
      if (priority !== undefined) updateObj.priority = priority;
      if (severity !== undefined) updateObj.severity = severity;
      if (platform !== undefined) updateObj.platform = platform;

      if (assigneeIds !== undefined || assigneeId !== undefined) {
        const raw = Array.isArray(assigneeIds)
          ? assigneeIds
          : assigneeId != null
            ? [assigneeId]
            : [];
        const resolved = await resolveBugAssignees(raw, existing.projectId);
        updateObj.assigneeIds = resolved;
        updateObj.assigneeId = resolved[0] ?? null;
      }
    }

    if (attachments !== undefined || attachmentUrl !== undefined) {
      const extra = normalizeAttachmentsInput(attachments, attachmentUrl, req.user.id);
      if (extra.length > 0) {
        updateObj.attachments = [...(existing.attachments ?? []), ...extra];
        updateObj.attachmentUrl = updateObj.attachments[0]?.url ?? existing.attachmentUrl;
      }
    }

    if (
      updateObj.qaStatus !== undefined ||
      updateObj.devStatus !== undefined ||
      updateObj.finalStatus !== undefined
    ) {
      const merged = {
        ...existing.toObject?.() ?? existing,
        ...updateObj,
      };
      const track = buildTrackPayload(merged, merged.assigneeIds ?? existing.assigneeIds);
      Object.assign(updateObj, track);
    }
  }

  if (Object.keys(updateObj).length === 0) badRequest("No valid fields to update.");

  const updated = await bugsTable.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
  if (!updated) notFound("Bug");

  if (updateObj.assigneeIds) {
    await notifyNewAssignees(
      updateObj.assigneeIds,
      existing.assigneeIds ?? (existing.assigneeId ? [existing.assigneeId] : []),
      req.user,
      updated,
      updated.projectId,
    );
  }

  res.json(await formatBugRow(updated));
}

async function patchBugsByIdAssign(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { assigneeId, assigneeIds } = req.body;
  const existing = await bugsTable.findOne({ id });
  if (!existing) notFound("Bug");

  const raw = Array.isArray(assigneeIds)
    ? assigneeIds
    : assigneeId != null
      ? [assigneeId]
      : [];
  const resolved = await resolveBugAssignees(raw, existing.projectId);

  const nextStatus =
    resolved.length > 0
      ? normalizeBugStatus(existing.status) === "reported"
        ? "assigned"
        : existing.status
      : "reported";

  const updated = await bugsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        assigneeIds: resolved,
        assigneeId: resolved[0] ?? null,
        status: nextStatus,
      },
    },
    { new: true },
  );
  if (!updated) notFound("Bug");

  await notifyNewAssignees(
    resolved,
    existing.assigneeIds ?? (existing.assigneeId ? [existing.assigneeId] : []),
    req.user,
    updated,
    updated.projectId,
  );

  res.json(await formatBugRow(updated));
}

export {
  getBugs,
  getBugsById,
  patchBugsById,
  patchBugsByIdAssign,
  postBugs,
  postBugsBatch,
  BUG_STATUSES,
};
