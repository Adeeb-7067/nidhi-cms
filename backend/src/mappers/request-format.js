import { usersTable, projectsTable } from "@/models/schema";
import { IdLookupCache } from "@/lib/lookup-cache";
import { toIso } from "@/utils/mongo-list";
async function formatRequestRows(rows) {
  const users = new IdLookupCache(async (ids) => {
    const rows2 = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows2;
  });
  const projects = new IdLookupCache(async (ids) => {
    const rows2 = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows2;
  });
  await Promise.all([
    users.preload(rows.map((r) => r.developerId)),
    projects.preload(rows.map((r) => r.projectId))
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
    createdAt: toIso(r.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: toIso(r.updatedAt) ?? (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function formatRequestRow(row) {
  const [formatted] = await formatRequestRows([row]);
  return formatted;
}
export {
  formatRequestRow,
  formatRequestRows
};
