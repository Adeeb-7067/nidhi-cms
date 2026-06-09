/** Must match backend `daily-log-virtual-projects.js` IDs. */
export const DAILY_LOG_VIRTUAL_PROJECTS = [
  { id: -2, name: "Meeting" },
  { id: -1, name: "Others" },
] as const;

export function isVirtualDailyLogProjectId(projectId: number): boolean {
  return DAILY_LOG_VIRTUAL_PROJECTS.some((p) => p.id === projectId);
}

export function dailyLogProjectLabel(projectId: number, projectName?: string | null): string {
  const virtual = DAILY_LOG_VIRTUAL_PROJECTS.find((p) => p.id === projectId);
  if (virtual) return virtual.name;
  return projectName?.trim() || "Unknown";
}
