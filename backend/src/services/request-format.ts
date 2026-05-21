import { usersTable, projectsTable } from "@/models/schema";
import { IdLookupCache } from "@/lib/lookup-cache";
import { toIso } from "@/lib/mongo-list";

type RequestRow = {
  id: number;
  developerId: number;
  projectId: number;
  type: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  adminNote?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export async function formatRequestRows(rows: RequestRow[]) {
  const users = new IdLookupCache<{ id: number; name: string }>(async (ids) => {
    const rows = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string }[];
  });
  const projects = new IdLookupCache<{ id: number; name: string }>(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string }[];
  });

  await Promise.all([
    users.preload(rows.map((r) => r.developerId)),
    projects.preload(rows.map((r) => r.projectId)),
  ]);

  return rows.map((r) => ({
    id: r.id,
    developerId: r.developerId,
    developerName: users.get(r.developerId)?.name ?? "Unknown",
    projectId: r.projectId,
    projectName: projects.get(r.projectId)?.name ?? "Unknown",
    type: r.type,
    title: r.title,
    description: r.description,
    urgency: r.urgency,
    status: r.status,
    adminNote: r.adminNote ?? null,
    createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(r.updatedAt) ?? new Date().toISOString(),
  }));
}

export async function formatRequestRow(row: RequestRow) {
  const [formatted] = await formatRequestRows([row]);
  return formatted;
}
