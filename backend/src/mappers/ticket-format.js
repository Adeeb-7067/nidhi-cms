import { usersTable, projectsTable } from "../models/schema/index.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
import { toIso } from "../utils/mongo-list.js";
import { ticketAudienceFromRole } from "../modules/work/services/ticket-support.js";
async function formatTicketRows(rows) {
  const users = new IdLookupCache(async (ids) => {
    const rows2 = await usersTable
      .find({ id: { $in: ids } }, { id: 1, name: 1, role: 1 })
      .lean()
      .exec();
    return rows2;
  });
  const projects = new IdLookupCache(async (ids) => {
    const rows2 = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows2;
  });
  await Promise.all([
    users.preload(rows.flatMap((t) => [t.creatorId, t.assignedTo])),
    projects.preload(rows.map((t) => t.projectId))
  ]);
  return rows.map((t) => {
    const creator = users.get(t.creatorId);
    const audience =
      t.audience ?? (creator?.role ? ticketAudienceFromRole(creator.role) : "staff");
    return {
    id: t.id,
    projectId: t.projectId ?? null,
    projectName: t.projectId ? projects.get(t.projectId)?.name ?? null : null,
    creatorId: t.creatorId,
    creatorName: creator?.name ?? "Unknown",
    creatorRole: creator?.role ?? null,
    audience,
    assignedTo: t.assignedTo ?? null,
    assigneeName: t.assignedTo ? users.get(t.assignedTo)?.name ?? null : null,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    attachments: t.attachments,
    createdAt: toIso(t.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: toIso(t.updatedAt) ?? (/* @__PURE__ */ new Date()).toISOString()
  };
  });
}
async function formatTicketRow(row) {
  const [formatted] = await formatTicketRows([row]);
  return formatted;
}
export {
  formatTicketRow,
  formatTicketRows
};
