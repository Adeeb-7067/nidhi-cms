import { projectsTable } from "../models/schema/index.js";

export async function loadProjectNameMap(projectIds) {
  const ids = [...new Set(projectIds.filter((id) => id != null))];
  if (!ids.length) return new Map();
  const rows = await projectsTable.find({ id: { $in: ids } }).select({ id: 1, name: 1 }).lean();
  return new Map(rows.map((p) => [p.id, p.name]));
}
