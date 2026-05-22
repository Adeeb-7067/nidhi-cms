import { usersTable, projectsTable } from "@/models/schema";
import { IdLookupCache } from "@/lib/lookup-cache";
import { toIso } from "@/utils/mongo-list";
async function formatBugRows(bugs) {
  const projects = new IdLookupCache(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows;
  });
  const users = new IdLookupCache(async (ids) => {
    const rows = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1, role: 1 }).lean().exec();
    return rows;
  });
  await Promise.all([
    projects.preload(bugs.map((b) => b.projectId)),
    users.preload(bugs.flatMap((b) => [b.reporterId, b.assigneeId]))
  ]);
  return bugs.map((bug) => {
    const assignee = bug.assigneeId ? users.get(bug.assigneeId) : null;
    return {
      id: bug.id,
      bugNumber: bug.bugNumber,
      projectId: bug.projectId,
      projectName: projects.get(bug.projectId)?.name ?? "Unknown",
      reporterId: bug.reporterId,
      reporterName: users.get(bug.reporterId)?.name ?? "Unknown",
      assigneeId: bug.assigneeId,
      assigneeName: assignee?.name ?? null,
      assigneeRole: assignee?.role ?? null,
      title: bug.title,
      description: bug.description,
      stepsToReproduce: bug.stepsToReproduce,
      expectedBehavior: bug.expectedBehavior,
      actualBehavior: bug.actualBehavior,
      severity: bug.severity,
      priority: bug.priority,
      status: bug.status,
      buildVersion: bug.buildVersion,
      platform: bug.platform,
      createdAt: toIso(bug.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
      resolvedAt: toIso(bug.resolvedAt),
      attachmentUrl: bug.attachmentUrl ?? null
    };
  });
}
async function formatBugRow(bug) {
  const [row] = await formatBugRows([bug]);
  return row;
}
export {
  formatBugRow,
  formatBugRows
};
