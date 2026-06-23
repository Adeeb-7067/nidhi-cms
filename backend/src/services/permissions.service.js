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
    evictPermissionCache(userId);
    return;
  }

  await usersTable.updateOne(
    { id: userId },
    { $set: { roleTemplateId: templateId, hrmRoleTemplateId: templateId } },
  );
  evictUserFromAuthCache(userId);
  evictPermissionCache(userId);
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

const PERM_CACHE_TTL_MS = 30_000;
/** @type {Map<number, { set: Set<string>, templateId: number | null, expiresAt: number }>} */
const _permCache = new Map();
/** @type {Promise<void> | null} */
let _templatesReadyPromise = null;

function ensureTemplatesReady() {
  if (!_templatesReadyPromise) {
    _templatesReadyPromise = ensureDefaultRoleTemplates().catch((err) => {
      _templatesReadyPromise = null;
      throw err;
    });
  }
  return _templatesReadyPromise;
}

function permissionEntryKey(module, action) {
  return `${normalizePermissionModule(module)}:${action}`;
}

/** Clear cached permissions after role/template changes. */
export function evictPermissionCache(userId) {
  if (userId == null) _permCache.clear();
  else _permCache.delete(userId);
}

async function loadUserPermissionEntry(userId) {
  const now = Date.now();
  const cached = _permCache.get(userId);
  if (cached && cached.expiresAt > now) return cached;

  const user = await usersTable
    .findOne({ id: userId }, { role: 1, roleTemplateId: 1, hrmRoleTemplateId: 1 })
    .lean();
  if (!user) return null;

  if (user.role === "super_admin") {
    const entry = {
      set: new Set(ALL_MODULE_ACTIONS.map((p) => permissionEntryKey(p.module, p.action))),
      templateId: null,
      expiresAt: now + PERM_CACHE_TTL_MS,
    };
    _permCache.set(userId, entry);
    return entry;
  }

  await ensureTemplatesReady();
  const templateId = await resolveTemplateIdForUser(user);
  if (!templateId) {
    const entry = { set: new Set(), templateId: null, expiresAt: now + PERM_CACHE_TTL_MS };
    _permCache.set(userId, entry);
    return entry;
  }

  const rows = await hrmPermissionsTable.find({ roleTemplateId: templateId }).lean();
  const entry = {
    set: new Set(rows.map((r) => permissionEntryKey(r.module, r.action))),
    templateId,
    expiresAt: now + PERM_CACHE_TTL_MS,
  };
  _permCache.set(userId, entry);
  return entry;
}

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
  const user = await usersTable.findOne({ id: userId }, { role: 1 }).lean();
  if (!user) return { permissions: [], templateId: null, groups: cmsModuleGroups };

  const entry = await loadUserPermissionEntry(userId);
  if (!entry) return { permissions: [], templateId: null, groups: cmsModuleGroups };

  const permissions = [...entry.set].map((key) => {
    const [module, action] = key.split(":");
    return { module, action };
  });

  return {
    permissions,
    templateId: entry.templateId,
    role: user.role,
    groups: cmsModuleGroups,
  };
}

export async function userHasPermission(userId, module, action) {
  const entry = await loadUserPermissionEntry(userId);
  if (!entry) return false;
  return entry.set.has(permissionEntryKey(module, action));
}

export async function listRoleTemplates() {
  await ensureTemplatesReady();
  const templates = await hrmRoleTemplatesTable.find().sort({ name: 1 }).lean();
  if (!templates.length) return [];

  const templateIds = templates.map((t) => t.id);
  const allPermissions = await hrmPermissionsTable
    .find({ roleTemplateId: { $in: templateIds } })
    .lean();
  const byTemplate = new Map();
  for (const p of allPermissions) {
    const list = byTemplate.get(p.roleTemplateId) ?? [];
    list.push(p);
    byTemplate.set(p.roleTemplateId, list);
  }

  return templates.map((t) => ({
    ...t,
    permissions: (byTemplate.get(t.id) ?? []).map((p) => ({
      id: p.id,
      module: normalizePermissionModule(p.module),
      action: p.action,
    })),
  }));
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
  for (const u of users) {
    evictUserFromAuthCache(u.id);
    evictPermissionCache(u.id);
  }
  evictPermissionCache(null);
}

export function getPermissionCatalog() {
  return { modules: cmsModules, actions: cmsActions, groups: cmsModuleGroups };
}
