/** Reserved project IDs for daily logs not tied to a client project. */
export const DAILY_LOG_VIRTUAL_PROJECTS = [
  { id: -1, name: "Others" },
  { id: -2, name: "Meeting" },
];

const VIRTUAL_BY_ID = new Map(DAILY_LOG_VIRTUAL_PROJECTS.map((p) => [p.id, p.name]));

export function isVirtualLogProjectId(projectId) {
  return VIRTUAL_BY_ID.has(Number(projectId));
}

export function resolveLogProjectName(projectId, projectRow) {
  const virtual = VIRTUAL_BY_ID.get(Number(projectId));
  if (virtual) return virtual;
  return projectRow?.name ?? "Unknown";
}

export function assertValidLogProjectId(projectId) {
  const id = Number(projectId);
  if (!Number.isFinite(id) || id === 0) return false;
  if (isVirtualLogProjectId(id)) return true;
  return id > 0;
}
