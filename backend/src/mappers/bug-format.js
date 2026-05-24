import { usersTable, projectsTable, commentsTable, bugsTable } from "../models/schema/index.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
import { toIso } from "../utils/mongo-list.js";
import {
  deriveLegacyStatus,
  normalizeBugStatus,
  normalizeFinalStatus,
  normalizeTrackStatus,
  rollupFromIssues,
} from "../services/bugs/bug-workflow.js";

function collectAssigneeIds(bug) {
  const ids = new Set();
  if (Array.isArray(bug.assigneeIds)) {
    for (const id of bug.assigneeIds) if (id) ids.add(id);
  }
  if (bug.assigneeId) ids.add(bug.assigneeId);
  return [...ids];
}

function normalizeAttachments(bug) {
  if (Array.isArray(bug.attachments) && bug.attachments.length > 0) {
    return bug.attachments.map((a) => ({
      url: a.url,
      name: a.name ?? null,
      mimeType: a.mimeType ?? null,
      uploadedBy: a.uploadedBy ?? null,
      createdAt: toIso(a.createdAt),
    }));
  }
  if (bug.attachmentUrl) {
    return [
      {
        url: bug.attachmentUrl,
        name: null,
        mimeType: null,
        uploadedBy: null,
        createdAt: toIso(bug.createdAt),
      },
    ];
  }
  return [];
}

function mapIssueToChild(bug, issue, base) {
  const track = {
    qaStatus: normalizeTrackStatus(issue.qaStatus),
    devStatus: normalizeTrackStatus(issue.devStatus),
    finalStatus: normalizeFinalStatus(issue.finalStatus),
  };
  return {
    id: bug.id,
    issueKey: issue.key,
    bugNumber: base.bugNumber,
    projectId: base.projectId,
    projectName: base.projectName,
    reporterId: base.reporterId,
    reporterName: base.reporterName,
    assigneeIds: base.assigneeIds,
    assignees: base.assignees,
    title: issue.title,
    description: null,
    priority: base.priority ?? bug.priority,
    severity: base.severity ?? bug.severity,
    ...track,
    status: deriveLegacyStatus({ ...bug, ...track }),
    parentBugId: bug.id,
    childCount: 0,
    children: [],
    issues: [],
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
}

async function loadLatestCommentsByBugId(bugIds) {
  if (!bugIds.length) return new Map();
  const rows = await commentsTable
    .find({ threadType: "bug", threadId: { $in: bugIds } }, { threadId: 1, content: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.threadId)) map.set(row.threadId, row.content);
  }
  return map;
}

async function formatBugRows(bugs) {
  const latestComments = await loadLatestCommentsByBugId(bugs.map((b) => b.id));
  const projects = new IdLookupCache(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows;
  });
  const users = new IdLookupCache(async (ids) => {
    const rows = await usersTable
      .find({ id: { $in: ids } }, { id: 1, name: 1, role: 1, avatarUrl: 1, employeeId: 1 })
      .lean()
      .exec();
    return rows;
  });

  const allAssigneeIds = bugs.flatMap((b) => [b.reporterId, ...collectAssigneeIds(b)]);
  await Promise.all([
    projects.preload(bugs.map((b) => b.projectId)),
    users.preload(allAssigneeIds),
  ]);

  return bugs.map((bug) => {
    const rawAssigneeIds = collectAssigneeIds(bug);
    const assigneeIdList = rawAssigneeIds.filter((id) => users.get(id)?.role === "developer");
    const primaryAssignee = assigneeIdList[0] ?? null;
    const assignee = primaryAssignee ? users.get(primaryAssignee) : null;
    const reporter = users.get(bug.reporterId);
    const assignees = assigneeIdList.map((id) => {
      const u = users.get(id);
      return {
        id,
        name: u?.name ?? "Unknown",
        role: u?.role ?? "developer",
        avatarUrl: u?.avatarUrl ?? null,
        employeeId: u?.employeeId ?? null,
      };
    });
    const attachments = normalizeAttachments(bug);

    const track =
      Array.isArray(bug.issues) && bug.issues.length > 0
        ? rollupFromIssues(bug.issues)
        : {
            qaStatus: normalizeTrackStatus(bug.qaStatus),
            devStatus: normalizeTrackStatus(bug.devStatus),
            finalStatus: normalizeFinalStatus(bug.finalStatus),
          };

    const base = {
      id: bug.id,
      bugNumber: bug.bugNumber,
      projectId: bug.projectId,
      projectName: projects.get(bug.projectId)?.name ?? "Unknown",
      reporterId: bug.reporterId,
      reporterName: reporter?.name ?? "Unknown",
      reporterRole: reporter?.role ?? null,
      assigneeId: primaryAssignee,
      assigneeName: assignee?.name ?? null,
      assigneeRole: assignee?.role ?? null,
      assigneeIds: assigneeIdList,
      assignees,
      title: bug.title,
      description: bug.description,
      stepsToReproduce: bug.stepsToReproduce,
      expectedBehavior: bug.expectedBehavior,
      actualBehavior: bug.actualBehavior,
      severity: bug.severity,
      priority: bug.priority,
      qaStatus: track.qaStatus,
      devStatus: track.devStatus,
      finalStatus: track.finalStatus,
      status: deriveLegacyStatus({ ...bug, ...track }),
      buildVersion: bug.buildVersion,
      platform: bug.platform,
      createdAt: toIso(bug.createdAt) ?? new Date().toISOString(),
      updatedAt: toIso(bug.updatedAt) ?? toIso(bug.createdAt) ?? new Date().toISOString(),
      resolvedAt: toIso(bug.resolvedAt),
      attachmentUrl: attachments[0]?.url ?? bug.attachmentUrl ?? null,
      attachments,
      latestComment: latestComments.get(bug.id) ?? null,
      parentBugId: bug.parentBugId ?? null,
      issues: [],
      childCount: 0,
      children: [],
    };

    if (Array.isArray(bug.issues) && bug.issues.length > 0) {
      const children = bug.issues.map((issue) => mapIssueToChild(bug, issue, base));
      base.issues = children;
      base.children = children;
      base.childCount = children.length;
    }

    return base;
  });
}

/** Legacy: attach separate child documents (old batches only) */
async function attachLegacyChildBugs(parentRows) {
  const parentIds = parentRows
    .filter((r) => r.childCount === 0 && !r.issues?.length)
    .map((r) => r.id);
  if (!parentIds.length) return parentRows;

  const childDocs = await bugsTable
    .find({ parentBugId: { $in: parentIds } })
    .sort({ id: 1 })
    .lean()
    .exec();
  if (!childDocs.length) return parentRows;

  const formattedChildren = await formatBugRows(childDocs);
  const byParent = new Map();
  for (let i = 0; i < childDocs.length; i++) {
    const pid = childDocs[i].parentBugId;
    if (!pid) continue;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(formattedChildren[i]);
  }

  return parentRows.map((row) => {
    const children = byParent.get(row.id) ?? [];
    if (!children.length) return row;
    return { ...row, childCount: children.length, children, issues: children };
  });
}

async function formatBugRow(bug) {
  const [row] = await formatBugRows([bug]);
  const [withLegacy] = await attachLegacyChildBugs([row]);
  return withLegacy;
}

async function formatBugList(bugs) {
  const rows = await formatBugRows(bugs);
  return attachLegacyChildBugs(rows);
}

export { attachLegacyChildBugs, formatBugList, formatBugRow, formatBugRows };
