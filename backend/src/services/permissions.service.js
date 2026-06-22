import {
  hrmRoleTemplatesTable,
  hrmPermissionsTable,
  usersTable,
  getNextSequence,
} from "../models/schema/index.js";
import {
  cmsActions,
  cmsModules,
  cmsModuleGroups,
  defaultTemplateByRole,
  legacyModuleMap,
  normalizePermissionModule,
} from "../constants/permissions.js";
import { evictUserFromAuthCache } from "../middlewares/auth.js";

const ALL_MODULE_ACTIONS = cmsModules.flatMap((module) =>
  cmsActions.map((action) => ({ module, action })),
);

const DEV_PORTAL_VIEW = [
  "dev_workspace",
  "dev_projects",
  "dev_logs",
  "dev_tasks",
  "dev_bugs",
  "dev_apk",
  "dev_reports",
  "dev_requests",
  "dev_screenshots",
].flatMap((module) => [
  { module, action: "view" },
  ...(module !== "dev_reports" && module !== "dev_screenshots"
    ? [{ module, action: "create" }]
    : []),
]);

const HRM_ADMIN_MODULES = cmsModuleGroups
  .filter((g) => g.label === "HRM" || g.label === "HRM self-service")
  .flatMap((g) => g.modules)
  .filter((m) => m !== "hrm_id_cards");

const DEFAULT_TEMPLATES = [
  { code: "super_admin", name: "Super Admin", isSystem: true, grants: "all" },
  {
    code: "hr_admin",
    name: "HR Admin",
    isSystem: true,
    grants: [
      ...HRM_ADMIN_MODULES.flatMap((module) =>
        cmsActions.map((action) => ({ module, action })),
      ),
      { module: "admin_team", action: "view" },
      { module: "admin_team", action: "edit" },
      { module: "monitor_attendance", action: "view" },
    ],
  },
  {
    code: "manager",
    name: "Manager",
    isSystem: true,
    grants: [
      { module: "hrm_dashboard", action: "view" },
      { module: "hrm_attendance", action: "view" },
      { module: "hrm_leave", action: "view" },
      { module: "hrm_leave", action: "approve" },
      { module: "hrm_wfh", action: "view" },
      { module: "hrm_wfh", action: "approve" },
      { module: "hrm_holidays", action: "view" },
      { module: "hrm_my_attendance", action: "view" },
      { module: "hrm_my_leave", action: "view" },
      { module: "hrm_my_leave", action: "create" },
      { module: "hrm_my_wfh", action: "view" },
      { module: "hrm_my_wfh", action: "create" },
      { module: "hrm_my_holidays", action: "view" },
      { module: "hrm_my_payslips", action: "view" },
      ...DEV_PORTAL_VIEW,
      { module: "admin_discussions", action: "view" },
      { module: "admin_tickets", action: "view" },
    ],
  },
  {
    code: "employee",
    name: "Employee",
    isSystem: true,
    grants: [
      { module: "hrm_dashboard", action: "view" },
      { module: "hrm_my_attendance", action: "view" },
      { module: "hrm_my_leave", action: "view" },
      { module: "hrm_my_leave", action: "create" },
      { module: "hrm_my_wfh", action: "view" },
      { module: "hrm_my_wfh", action: "create" },
      { module: "hrm_my_holidays", action: "view" },
      { module: "hrm_my_payslips", action: "view" },
      { module: "hrm_holidays", action: "view" },
      ...DEV_PORTAL_VIEW,
      { module: "admin_discussions", action: "view" },
      { module: "admin_tickets", action: "view" },
    ],
  },
  {
    code: "payroll_viewer",
    name: "Payroll Viewer",
    isSystem: true,
    grants: [
      { module: "hrm_payroll", action: "view" },
      { module: "hrm_payroll", action: "export" },
      { module: "hrm_employees", action: "view" },
    ],
  },
];

export async function migrateLegacyPermissionModules() {
  for (const [legacy, modern] of Object.entries(legacyModuleMap)) {
    await hrmPermissionsTable.updateMany({ module: legacy }, { $set: { module: modern } });
  }
}

export async function ensureDefaultRoleTemplates() {
  await migrateLegacyPermissionModules();

  for (const tpl of DEFAULT_TEMPLATES) {
    let existing = await hrmRoleTemplatesTable.findOne({ code: tpl.code }).lean();
    if (!existing) {
      const id = await getNextSequence("hrm_role_templates");
      existing = await hrmRoleTemplatesTable.create({
        id,
        name: tpl.name,
        code: tpl.code,
        isSystem: tpl.isSystem,
      });
    }
    const templateId = existing.id;
    const count = await hrmPermissionsTable.countDocuments({ roleTemplateId: templateId });
    if (count > 0) continue;

    let grants = tpl.grants;
    if (grants === "all") grants = ALL_MODULE_ACTIONS;

    for (const g of grants) {
      const pid = await getNextSequence("hrm_permissions");
      await hrmPermissionsTable.create({
        id: pid,
        roleTemplateId: templateId,
        module: normalizePermissionModule(g.module),
        action: g.action,
      });
    }
  }
}

/** Merge missing default grants into system templates (safe to run on every boot). */
export async function backfillSystemTemplatePermissions() {
  await ensureDefaultRoleTemplates();

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await hrmRoleTemplatesTable.findOne({ code: tpl.code }).lean();
    if (!existing) continue;

    let grants = tpl.grants;
    if (grants === "all") grants = ALL_MODULE_ACTIONS;

    const rows = await hrmPermissionsTable.find({ roleTemplateId: existing.id }).lean();
    const have = new Set(
      rows.map((r) => `${normalizePermissionModule(r.module)}:${r.action}`),
    );

    for (const g of grants) {
      const key = `${normalizePermissionModule(g.module)}:${g.action}`;
      if (have.has(key)) continue;
      const pid = await getNextSequence("hrm_permissions");
      await hrmPermissionsTable.create({
        id: pid,
        roleTemplateId: existing.id,
        module: normalizePermissionModule(g.module),
        action: g.action,
      });
    }
  }
}

async function templateIdForRole(role) {
  const code = defaultTemplateByRole[role];
  if (!code) return null;
  const tpl = await hrmRoleTemplatesTable.findOne({ code }).lean();
  return tpl?.id ?? null;
}

/** Assign default role template when role changes or user has none. */
export async function syncUserRoleTemplate(userId, role, options = {}) {
  const { explicitTemplateId, roleChanged = false } = options;
  await ensureDefaultRoleTemplates();

  if (explicitTemplateId !== undefined) return;

  const user = await usersTable
    .findOne({ id: userId }, { roleTemplateId: 1, hrmRoleTemplateId: 1 })
    .lean();
  if (!user) return;

  const hasTemplate = user.roleTemplateId != null || user.hrmRoleTemplateId != null;
  if (hasTemplate && !roleChanged) return;

  const templateId = await templateIdForRole(role);
  if (!templateId) {
    await usersTable.updateOne(
      { id: userId },
      { $set: { roleTemplateId: null, hrmRoleTemplateId: null } },
    );
    evictUserFromAuthCache(userId);
    return;
  }

  await usersTable.updateOne(
    { id: userId },
    { $set: { roleTemplateId: templateId, hrmRoleTemplateId: templateId } },
  );
  evictUserFromAuthCache(userId);
}

/** One-time-style migration: attach templates to staff missing roleTemplateId. */
export async function assignRoleTemplatesToUsers() {
  await ensureDefaultRoleTemplates();

  const users = await usersTable
    .find({
      role: { $ne: "client" },
      $or: [
        { roleTemplateId: null },
        { roleTemplateId: { $exists: false } },
        { hrmRoleTemplateId: null },
        { hrmRoleTemplateId: { $exists: false } },
      ],
    })
    .lean();

  for (const user of users) {
    const templateId = await templateIdForRole(user.role);
    if (!templateId) continue;
    await usersTable.updateOne(
      { id: user.id },
      { $set: { roleTemplateId: templateId, hrmRoleTemplateId: templateId } },
    );
  }
}

/** @deprecated alias */
export const ensureDefaultHrmTemplates = ensureDefaultRoleTemplates;

function resolveRoleTemplateId(user) {
  const explicit = user.roleTemplateId ?? user.hrmRoleTemplateId;
  if (explicit) return explicit;
  const code = defaultTemplateByRole[user.role];
  if (!code) return null;
  return code;
}

async function resolveTemplateIdForUser(user) {
  const codeOrId = resolveRoleTemplateId(user);
  if (codeOrId == null) return null;
  if (typeof codeOrId === "number") return codeOrId;
  const tpl = await hrmRoleTemplatesTable.findOne({ code: codeOrId }).lean();
  return tpl?.id ?? null;
}

export async function getPermissionsForUser(userId) {
  const user = await usersTable.findOne({ id: userId }).lean();
  if (!user) return { permissions: [], templateId: null, groups: cmsModuleGroups };

  if (user.role === "super_admin") {
    await ensureDefaultRoleTemplates();
    return {
      permissions: ALL_MODULE_ACTIONS,
      templateId: null,
      role: user.role,
      groups: cmsModuleGroups,
    };
  }

  await ensureDefaultRoleTemplates();
  const templateId = await resolveTemplateIdForUser(user);
  if (!templateId) {
    return { permissions: [], templateId: null, role: user.role, groups: cmsModuleGroups };
  }

  const rows = await hrmPermissionsTable.find({ roleTemplateId: templateId }).lean();
  return {
    permissions: rows.map((r) => ({
      module: normalizePermissionModule(r.module),
      action: r.action,
    })),
    templateId,
    role: user.role,
    groups: cmsModuleGroups,
  };
}

export async function userHasPermission(userId, module, action) {
  const user = await usersTable.findOne({ id: userId }, { role: 1 }).lean();
  if (user?.role === "super_admin") return true;
  const normalized = normalizePermissionModule(module);
  const { permissions } = await getPermissionsForUser(userId);
  return permissions.some((p) => p.module === normalized && p.action === action);
}

export async function listRoleTemplates() {
  await ensureDefaultRoleTemplates();
  const templates = await hrmRoleTemplatesTable.find().sort({ name: 1 }).lean();
  const result = [];
  for (const t of templates) {
    const permissions = await hrmPermissionsTable.find({ roleTemplateId: t.id }).lean();
    result.push({
      ...t,
      permissions: permissions.map((p) => ({
        id: p.id,
        module: normalizePermissionModule(p.module),
        action: p.action,
      })),
    });
  }
  return result;
}

export async function updateRoleTemplatePermissions(templateId, permissionList) {
  await hrmPermissionsTable.deleteMany({ roleTemplateId: templateId });
  for (const p of permissionList) {
    const id = await getNextSequence("hrm_permissions");
    await hrmPermissionsTable.create({
      id,
      roleTemplateId: templateId,
      module: normalizePermissionModule(p.module),
      action: p.action,
    });
  }
  const users = await usersTable.find(
    { $or: [{ hrmRoleTemplateId: templateId }, { roleTemplateId: templateId }] },
    { id: 1 },
  ).lean();
  for (const u of users) evictUserFromAuthCache(u.id);
}

export function getPermissionCatalog() {
  return { modules: cmsModules, actions: cmsActions, groups: cmsModuleGroups };
}
