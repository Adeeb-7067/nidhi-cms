import { usersTable, projectsTable } from "@workspace/db/schema";
import { IdLookupCache } from "./lookup-cache";
import { toIso } from "./mongo-list";

export type BugRow = {
  id: number;
  bugNumber: string;
  projectId: number;
  reporterId: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  severity: string;
  priority: string;
  status: string;
  buildVersion: string | null;
  platform: string;
  createdAt?: Date | null;
  resolvedAt?: Date | null;
  attachmentUrl?: string | null;
};

export async function formatBugRows(bugs: BugRow[]) {
  const projects = new IdLookupCache<{ id: number; name: string }>(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string }[];
  });
  const users = new IdLookupCache<{ id: number; name: string; role: string }>(async (ids) => {
    const rows = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1, role: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string; role: string }[];
  });

  await Promise.all([
    projects.preload(bugs.map((b) => b.projectId)),
    users.preload(bugs.flatMap((b) => [b.reporterId, b.assigneeId])),
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
      createdAt: toIso(bug.createdAt) ?? new Date().toISOString(),
      resolvedAt: toIso(bug.resolvedAt),
      attachmentUrl: bug.attachmentUrl ?? null,
    };
  });
}

export async function formatBugRow(bug: BugRow) {
  const [row] = await formatBugRows([bug]);
  return row;
}
