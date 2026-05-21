import { usersTable, projectsTable } from "@/models/schema";
import { IdLookupCache } from "@/lib/lookup-cache";
import { toIso } from "@/lib/mongo-list";

type TicketRow = {
  id: number;
  projectId?: number | null;
  creatorId: number;
  assignedTo?: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  attachments?: unknown;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export async function formatTicketRows(rows: TicketRow[]) {
  const users = new IdLookupCache<{ id: number; name: string }>(async (ids) => {
    const rows = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string }[];
  });
  const projects = new IdLookupCache<{ id: number; name: string }>(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string }[];
  });

  await Promise.all([
    users.preload(rows.flatMap((t) => [t.creatorId, t.assignedTo])),
    projects.preload(rows.map((t) => t.projectId)),
  ]);

  return rows.map((t) => ({
    id: t.id,
    projectId: t.projectId ?? null,
    projectName: t.projectId ? projects.get(t.projectId)?.name ?? null : null,
    creatorId: t.creatorId,
    creatorName: users.get(t.creatorId)?.name ?? "Unknown",
    assignedTo: t.assignedTo ?? null,
    assigneeName: t.assignedTo ? users.get(t.assignedTo)?.name ?? null : null,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    attachments: t.attachments,
    createdAt: toIso(t.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(t.updatedAt) ?? new Date().toISOString(),
  }));
}

export async function formatTicketRow(row: TicketRow) {
  const [formatted] = await formatTicketRows([row]);
  return formatted;
}
