/** Frontend mirror of backend/src/constants/client-team.js (kept in sync manually). */

export type ClientPortalSection =
  | "overview"
  | "progress"
  | "developers"
  | "milestones"
  | "discussions"
  | "documents"
  | "tasks"
  | "meeting_notes"
  | "invoices"
  | "reports";

export type ClientPermissionLevel =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "full";

export const CLIENT_PORTAL_SECTIONS: ClientPortalSection[] = [
  "overview",
  "progress",
  "developers",
  "milestones",
  "discussions",
  "documents",
  "tasks",
  "meeting_notes",
  "invoices",
  "reports",
];

export const CLIENT_SECTION_LABELS: Record<ClientPortalSection, string> = {
  overview: "Project Overview",
  progress: "Project Progress & Status Updates",
  developers: "Developers Assigned to the Project",
  milestones: "Milestones & Deadlines",
  discussions: "Discussion / Communication",
  documents: "Documents & Files",
  tasks: "Tasks & Deliverables",
  meeting_notes: "Meeting Notes",
  invoices: "Invoices & Payments",
  reports: "Reports & Analytics",
};

export const CLIENT_SECTION_DESCRIPTIONS: Record<ClientPortalSection, string> = {
  overview: "Project summaries, technology stack, and key links.",
  progress: "Live status, completion %, and progress dashboards.",
  developers: "Team members assigned to each project.",
  milestones: "Timeline of milestones and deadlines.",
  discussions: "Project chat and messaging with the delivery team.",
  documents: "Files and resources shared with the company.",
  tasks: "Tasks and deliverables across projects.",
  meeting_notes: "Notes captured during client meetings.",
  invoices: "Billing, invoices, and payment status.",
  reports: "Cross-project analytics and reports.",
};

export const CLIENT_PERMISSION_LEVELS: ClientPermissionLevel[] = [
  "none",
  "view",
  "create",
  "edit",
  "delete",
  "full",
];

export const CLIENT_PERMISSION_LABELS: Record<ClientPermissionLevel, string> = {
  none: "No access",
  view: "View only",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  full: "Full access",
};

const LEVEL_RANK: Record<ClientPermissionLevel, number> = {
  none: 0,
  view: 1,
  create: 2,
  edit: 3,
  delete: 4,
  full: 5,
};

export function permissionLevelRank(level: string | undefined | null): number {
  if (!level) return 0;
  return LEVEL_RANK[level as ClientPermissionLevel] ?? 0;
}

export function hasPermission(
  granted: string | undefined | null,
  required: ClientPermissionLevel,
): boolean {
  return permissionLevelRank(granted) >= LEVEL_RANK[required];
}

export function defaultMemberPermissions(): Record<ClientPortalSection, ClientPermissionLevel> {
  const out = {} as Record<ClientPortalSection, ClientPermissionLevel>;
  for (const section of CLIENT_PORTAL_SECTIONS) {
    out[section] = section === "invoices" ? "none" : "view";
  }
  return out;
}

export function adminPermissions(): Record<ClientPortalSection, ClientPermissionLevel> {
  const out = {} as Record<ClientPortalSection, ClientPermissionLevel>;
  for (const section of CLIENT_PORTAL_SECTIONS) out[section] = "full";
  return out;
}

export function permissionBadgeClass(level: string | undefined | null): string {
  switch (level) {
    case "full":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "delete":
      return "bg-red-500/15 text-red-700 border-red-500/30";
    case "edit":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "create":
      return "bg-cyan-500/15 text-cyan-700 border-cyan-500/30";
    case "view":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "none":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function memberStatusBadgeClass(status: string | undefined | null): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "inactive":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
