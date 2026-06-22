/**
 * RBAC vocabulary for the Client Team Management feature.
 *
 * Sections map 1:1 to logical screens inside the client portal. They are
 * intentionally decoupled from URL routes so reorganising the UI doesn't
 * require a permission migration. New sections can be appended freely.
 *
 * Levels are ordered from least to most privileged. `none` and `view` are
 * frontend-only display states; the backend only checks numeric rank, so
 * granting `edit` (rank 3) automatically implies `view` and `create`.
 */

export const CLIENT_PORTAL_SECTIONS = [
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

export const CLIENT_SECTION_LABELS = {
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

export const CLIENT_PERMISSION_LEVELS = ["none", "view", "create", "edit", "delete", "full"];

const LEVEL_RANK = {
  none: 0,
  view: 1,
  create: 2,
  edit: 3,
  delete: 4,
  full: 5,
};

export function permissionLevelRank(level) {
  if (typeof level !== "string") return 0;
  return LEVEL_RANK[level] ?? 0;
}

/** True when `granted` confers at least the privileges of `required`. */
export function permissionGranted(granted, required) {
  return permissionLevelRank(granted) >= permissionLevelRank(required);
}

export function isValidSection(section) {
  return CLIENT_PORTAL_SECTIONS.includes(section);
}

export function isValidLevel(level) {
  return CLIENT_PERMISSION_LEVELS.includes(level);
}

/**
 * Default permission map for a freshly invited team member: read-only access
 * to all sections except Invoices & Payments, which is opt-in given its
 * sensitivity.
 */
export function defaultMemberPermissions() {
  const out = {};
  for (const section of CLIENT_PORTAL_SECTIONS) {
    out[section] = section === "invoices" ? "none" : "view";
  }
  return out;
}

export function adminPermissions() {
  const out = {};
  for (const section of CLIENT_PORTAL_SECTIONS) out[section] = "full";
  return out;
}

/**
 * Coerce arbitrary input from the wire into a sanitised permissions map.
 * Unknown sections are dropped, unknown levels fall back to `none`.
 */
export function sanitisePermissions(input) {
  const out = {};
  if (!input || typeof input !== "object") return defaultMemberPermissions();
  for (const section of CLIENT_PORTAL_SECTIONS) {
    const value = input[section];
    out[section] = isValidLevel(value) ? value : "none";
  }
  return out;
}
