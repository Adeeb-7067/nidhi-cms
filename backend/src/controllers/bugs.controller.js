import {
  bugsTable,
  projectsTable,
  projectMembersTable,
  getNextSequence
} from "@/models/schema";
import { validateStoredFileUrl } from "@/lib/file-storage";
import { projectCompanyId } from "@/services/access/company-access";
import {
  notifyAssignment,
  resolveBugAssignee
} from "@/services/work-assignments";
import { formatBugRow, formatBugRows } from "@/mappers/bug-format";
import { paginateModel } from "@/utils/mongo-list";
import {
  parsePagination,
  badRequest,
  forbidden,
  notFound
} from "@/utils/route-errors";
async function generateBugNumber() {
  const count = await getNextSequence("bugs_count");
  return `BUG-${String(count).padStart(4, "0")}`;
}
async function buildBugListQuery(userId, role, params) {
  const query = {};
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
async function getBugs(req, res) {
  const params = req.query;
  const pagination = parsePagination(req.query);
  const query = await buildBugListQuery(req.user.id, req.user.role, params);
  const { items, total, page, limit } = await paginateModel(bugsTable, query, pagination);
  const bugs = await formatBugRows(items);
  res.json({ bugs, total, page, limit });
}
async function postBugs(req, res) {
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
    attachmentUrl
  } = req.body;
  if (!projectId || !title || !severity || !priority || !platform) {
    badRequest("projectId, title, severity, priority, and platform are required.");
  }
  validateStoredFileUrl(attachmentUrl, "attachmentUrl");
  const resolvedAssigneeId = await resolveBugAssignee(assigneeId, projectId);
  const project = await projectsTable.findOne({ id: projectId });
  const bugId = await getNextSequence("bugs");
  const bugNumber = await generateBugNumber();
  const bug = await bugsTable.create({
    id: bugId,
    bugNumber,
    companyId: project ? projectCompanyId(project) : null,
    projectId,
    reporterId: req.user.id,
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
    status: resolvedAssigneeId ? "in_progress" : "open"
  });
  if (resolvedAssigneeId) {
    await notifyAssignment({
      targetUserId: resolvedAssigneeId,
      actorId: req.user.id,
      actorName: req.user.name,
      title: "Bug assigned to you",
      body: `${req.user.name} assigned ${bug.bugNumber}: ${bug.title}`,
      type: "bug",
      projectId,
      entityId: bug.id
    });
  }
  res.status(201).json(await formatBugRow(bug));
}
async function getBugsById(req, res) {
  const bug = await bugsTable.findOne({ id: Number.parseInt(req.params.id, 10) });
  if (!bug) notFound("Bug");
  res.json(await formatBugRow(bug));
}
async function patchBugsById(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await bugsTable.findOne({ id });
  if (!existing) notFound("Bug");
  const role = req.user.role;
  const isQaOrAdmin = role === "tester" || role === "super_admin";
  const isAssigneeDev = role === "developer" && existing.assigneeId === req.user.id;
  if (!isQaOrAdmin && !isAssigneeDev) forbidden();
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
    attachmentUrl
  } = req.body;
  if (!isQaOrAdmin) {
    const updateObj2 = {};
    if (status !== void 0) updateObj2.status = status;
    if (Object.keys(updateObj2).length === 0) {
      badRequest("Developers may only update status.", "status");
    }
    if (status === "fixed" || status === "wont_fix" || status === "duplicate") {
      updateObj2.resolvedAt = /* @__PURE__ */ new Date();
    }
    const updated2 = await bugsTable.findOneAndUpdate({ id }, { $set: updateObj2 }, { new: true });
    if (!updated2) notFound("Bug");
    res.json(await formatBugRow(updated2));
    return;
  }
  validateStoredFileUrl(attachmentUrl, "attachmentUrl");
  const updateObj = {
    ...title !== void 0 && { title },
    ...description !== void 0 && { description },
    ...stepsToReproduce !== void 0 && { stepsToReproduce },
    ...expectedBehavior !== void 0 && { expectedBehavior },
    ...actualBehavior !== void 0 && { actualBehavior },
    ...severity !== void 0 && { severity },
    ...priority !== void 0 && { priority },
    ...status !== void 0 && { status },
    ...buildVersion !== void 0 && { buildVersion },
    ...platform !== void 0 && { platform },
    ...attachmentUrl !== void 0 && { attachmentUrl }
  };
  if (assigneeId !== void 0) {
    updateObj.assigneeId = await resolveBugAssignee(assigneeId, existing.projectId);
    if (updateObj.assigneeId && !status) {
      updateObj.status = existing.status === "open" ? "in_progress" : existing.status;
    }
  }
  if (status === "fixed" || status === "wont_fix" || status === "duplicate") {
    updateObj.resolvedAt = /* @__PURE__ */ new Date();
  }
  const updated = await bugsTable.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
  if (!updated) notFound("Bug");
  const newAssignee = updateObj.assigneeId;
  if (newAssignee && newAssignee !== existing.assigneeId) {
    await notifyAssignment({
      targetUserId: newAssignee,
      actorId: req.user.id,
      actorName: req.user.name,
      title: "Bug assigned to you",
      body: `${req.user.name} assigned ${updated.bugNumber}: ${updated.title}`,
      type: "bug",
      projectId: updated.projectId,
      entityId: updated.id
    });
  }
  res.json(await formatBugRow(updated));
}
async function patchBugsByIdAssign(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { assigneeId } = req.body;
  const existing = await bugsTable.findOne({ id });
  if (!existing) notFound("Bug");
  const resolvedAssigneeId = await resolveBugAssignee(assigneeId, existing.projectId);
  const updated = await bugsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        assigneeId: resolvedAssigneeId,
        status: resolvedAssigneeId ? existing.status === "open" ? "in_progress" : existing.status : "open"
      }
    },
    { new: true }
  );
  if (!updated) notFound("Bug");
  if (resolvedAssigneeId && resolvedAssigneeId !== existing.assigneeId) {
    await notifyAssignment({
      targetUserId: resolvedAssigneeId,
      actorId: req.user.id,
      actorName: req.user.name,
      title: "Bug assigned to you",
      body: `${req.user.name} assigned ${updated.bugNumber}: ${updated.title}`,
      type: "bug",
      projectId: updated.projectId,
      entityId: updated.id
    });
  }
  res.json(await formatBugRow(updated));
}
export {
  getBugs,
  getBugsById,
  patchBugsById,
  patchBugsByIdAssign,
  postBugs
};
