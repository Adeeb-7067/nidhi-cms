/**
 * Role-specific daily log work categories and form copy.
 *
 * Isolation rules (do not break delivery):
 * - `digital` → marketing categories + digital project picker only
 * - `bde` → sales categories
 * - everyone else (developer, qa, tester, manager, freelancer, …) → engineering form
 */

export type DailyLogWorkCategory = { id: string; label: string };

export const DEV_WORK_CATEGORIES: DailyLogWorkCategory[] = [
  { id: "development", label: "Development" },
  { id: "design", label: "Design" },
  { id: "testing", label: "Testing" },
  { id: "bug_fixing", label: "Bug Fixing" },
  { id: "code_review", label: "Code Review" },
  { id: "deployment", label: "Deployment" },
  { id: "documentation", label: "Documentation" },
  { id: "meeting", label: "Meeting" },
  { id: "research", label: "Research" },
];

export const BDE_WORK_CATEGORIES: DailyLogWorkCategory[] = [
  { id: "lead_generation", label: "Lead generation" },
  { id: "follow_up", label: "Follow-up" },
  { id: "proposal", label: "Proposal" },
  { id: "client_meeting", label: "Client meeting" },
  { id: "negotiation", label: "Negotiation" },
  { id: "demo", label: "Product demo" },
  { id: "documentation", label: "Documentation" },
  { id: "meeting", label: "Internal meeting" },
  { id: "research", label: "Research" },
];

/** Digital / marketing specialists — not engineering categories. */
export const DIGITAL_WORK_CATEGORIES: DailyLogWorkCategory[] = [
  { id: "content", label: "Content" },
  { id: "graphics", label: "Graphics" },
  { id: "video", label: "Video" },
  { id: "social", label: "Social media" },
  { id: "seo", label: "SEO" },
  { id: "ads", label: "Ads / campaigns" },
  { id: "reporting", label: "Reporting" },
  { id: "client_communication", label: "Client communication" },
  { id: "media_management", label: "Media vault" },
  { id: "meeting", label: "Meeting" },
  { id: "research", label: "Research" },
];

export type DailyLogFormCopy = {
  dialogTitleCreate: string;
  dialogTitleEdit: string;
  projectLabel: string;
  projectPlaceholder: string;
  projectHint: string;
  projectsGroupLabel: string;
  taskTitleLabel: string;
  taskTitlePlaceholder: string;
  categoriesLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  blockersLabel: string;
  blockersPlaceholder: string;
  nextDayPlanLabel: string;
  nextDayPlanPlaceholder: string;
  exportStaffFallback: string;
};

const DEV_FORM_COPY: DailyLogFormCopy = {
  dialogTitleCreate: "Add Daily Log Entry",
  dialogTitleEdit: "Edit Daily Log Entry",
  projectLabel: "Project / activity",
  projectPlaceholder: "Select project or activity",
  projectHint: "Use Meeting or Others when the time is not tied to a specific project.",
  projectsGroupLabel: "Projects",
  taskTitleLabel: "Task Title",
  taskTitlePlaceholder: "What did you work on?",
  categoriesLabel: "Categories",
  descriptionLabel: "Description (Optional)",
  descriptionPlaceholder: "Details of the task...",
  blockersLabel: "Blockers (Optional)",
  blockersPlaceholder: "Any blockers or impediments?",
  nextDayPlanLabel: "Next Day Plan (Optional)",
  nextDayPlanPlaceholder: "Plan for tomorrow?",
  exportStaffFallback: "Enterprise Developer",
};

const BDE_FORM_COPY: DailyLogFormCopy = {
  ...DEV_FORM_COPY,
  projectLabel: "Customer project / activity",
  projectsGroupLabel: "Projects",
  taskTitlePlaceholder: "What sales activity did you complete?",
  descriptionPlaceholder: "Details of the activity...",
  blockersPlaceholder: "Any blockers (awaiting client, pricing…)?",
  exportStaffFallback: "BDE",
};

const DIGITAL_FORM_COPY: DailyLogFormCopy = {
  dialogTitleCreate: "Add Digital Log Entry",
  dialogTitleEdit: "Edit Digital Log Entry",
  projectLabel: "Digital project / activity",
  projectPlaceholder: "Select digital project or activity",
  projectHint: "Pick a digital client project, or Meeting / Others for internal time.",
  projectsGroupLabel: "Digital projects",
  taskTitleLabel: "Work title",
  taskTitlePlaceholder: "e.g. Meta creatives, SEO keywords, client report…",
  categoriesLabel: "Work type",
  descriptionLabel: "Details (Optional)",
  descriptionPlaceholder: "Platforms, deliverables, links, or outcomes…",
  blockersLabel: "Blockers / waiting on (Optional)",
  blockersPlaceholder: "Client approval, assets, access, revisions…?",
  nextDayPlanLabel: "Next day plan (Optional)",
  nextDayPlanPlaceholder: "What will you ship tomorrow?",
  exportStaffFallback: "Digital Specialist",
};

/** True only for CMS digital specialists — never for developer/qa/freelancer. */
export function usesDigitalDailyLogForm(role: string | undefined): boolean {
  return role === "digital";
}

export function usesBdeDailyLogForm(role: string | undefined): boolean {
  return role === "bde";
}

export function workCategoriesForRole(role: string | undefined): DailyLogWorkCategory[] {
  if (usesBdeDailyLogForm(role)) return BDE_WORK_CATEGORIES;
  if (usesDigitalDailyLogForm(role)) return DIGITAL_WORK_CATEGORIES;
  // developer | qa | tester | manager | freelancer | hr | finance | …
  return DEV_WORK_CATEGORIES;
}

/**
 * When editing, keep any already-saved categories visible even if they are not
 * in the current role catalog (avoids silent drop / empty checkboxes).
 */
export function workCategoriesForForm(
  role: string | undefined,
  selectedIds: string[] | undefined,
): DailyLogWorkCategory[] {
  const base = workCategoriesForRole(role);
  if (!selectedIds?.length) return base;
  const have = new Set(base.map((c) => c.id));
  const extras: DailyLogWorkCategory[] = [];
  for (const id of selectedIds) {
    if (!id || have.has(id)) continue;
    have.add(id);
    extras.push({ id, label: formatDailyLogCategory(id) });
  }
  return extras.length ? [...base, ...extras] : base;
}

export function dailyLogFormCopyForRole(role: string | undefined): DailyLogFormCopy {
  if (usesBdeDailyLogForm(role)) return BDE_FORM_COPY;
  if (usesDigitalDailyLogForm(role)) return DIGITAL_FORM_COPY;
  return DEV_FORM_COPY;
}

/** Admin filter list: unique ids across all role catalogs. */
export function allDailyLogWorkCategoryIds(): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const cat of [...DEV_WORK_CATEGORIES, ...BDE_WORK_CATEGORIES, ...DIGITAL_WORK_CATEGORIES]) {
    if (seen.has(cat.id)) continue;
    seen.add(cat.id);
    ids.push(cat.id);
  }
  return ids;
}

/** Prefer first catalog label for shared ids (dev "Meeting" wins over later variants). */
const CATEGORY_LABEL_BY_ID = new Map<string, string>();
for (const cat of [...DEV_WORK_CATEGORIES, ...BDE_WORK_CATEGORIES, ...DIGITAL_WORK_CATEGORIES]) {
  if (!CATEGORY_LABEL_BY_ID.has(cat.id)) {
    CATEGORY_LABEL_BY_ID.set(cat.id, cat.label);
  }
}

export function formatDailyLogCategory(id: string): string {
  return CATEGORY_LABEL_BY_ID.get(id) ?? id.replace(/_/g, " ");
}
