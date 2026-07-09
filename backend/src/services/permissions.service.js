import {
  hrmRoleTemplatesTable,
  hrmPermissionsTable,
  usersTable,
  getNextSequence,
  getNextSequenceRange,
} from "../models/schema/index.js";
import {
  cmsActions,
  cmsModules,
  cmsModuleGroups,
  defaultTemplateByRole,
  builtInAssignableCmsRoles,
  legacyModuleMap,
  normalizePermissionModule,
  salesModules,
} from "../constants/permissions.js";
import { userRoles } from "../constants/user-roles.js";
import { evictUserFromAuthCache } from "../middlewares/auth.js";
import { runInTx } from "../lib/db-tx.js";

const VALID_MODULES = new Set(cmsModules);
const VALID_ACTIONS = new Set(cmsActions);

const ALL_MODULE_ACTIONS = cmsModules.flatMap((module) =>
  cmsActions.map((action) => ({ module, action })),
);

const SALES_BDE_EXCLUDED = new Set(["sales_team"]);
const SALES_BDE_VIEW_ONLY = new Set(["sales_settings", "sales_products"]);

const SALES_BDE_GRANTS = salesModules
  .filter((module) => !SALES_BDE_EXCLUDED.has(module))
  .flatMap((module) => {
    if (SALES_BDE_VIEW_ONLY.has(module)) {
      return [{ module, action: "view" }];
    }
    return [
      { module, action: "view" },
      { module, action: "create" },
      { module, action: "edit" },
      { module, action: "delete" },
    ];
  });

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
  .flatMap((g) => g.modules);

const FINANCE_MODULES = cmsModuleGroups
  .filter((g) => g.label === "Finance")
  .flatMap((g) => g.modules);

const FINANCE_FULL_ACCESS = new Set([
  "finance_expenses",
  "finance_invoices",
  "finance_budgets",
  "finance_notifications",
]);

const FINANCE_GRANTS = FINANCE_MODULES.flatMap((module) => {
  const grants = [{ module, action: "view" }];
  if (module === "finance_reports") {
    grants.push({ module, action: "export" });
    return grants;
  }
  if (module === "finance_dashboard") return grants;
  grants.push({ module, action: "create" });
  if (FINANCE_FULL_ACCESS.has(module)) {
    grants.push({ module, action: "edit" });
    if (module !== "finance_notifications") {
      grants.push({ module, action: "delete" });
    }
  }
  if (module === "finance_expenses") {
    grants.push({ module, action: "approve" });
  }
  return grants;
});

const DEFAULT_TEMPLATES = [
  { code: "super_admin", name: "Super Admin", cmsRole: "super_admin", isSystem: true, grants: "all" },
  {
    code: "hr_admin",
    name: "HR Admin",
    cmsRole: "hr",
    isSystem: true,
    grants: [
      ...HRM_ADMIN_MODULES.flatMap((module) =>
        cmsActions.map((action) => ({ module, action })),
      ),
      ...salesModules.map((module) => ({ module, action: "view" })),
      { module: "sales_settings", action: "edit" },
      { module: "sales_team", action: "view" },
      { module: "sales_team", action: "edit" },
      { module: "admin_team", action: "view" },
      { module: "admin_team", action: "edit" },
      { module: "roles_permissions", action: "view" },
      { module: "monitor_attendance", action: "view" },
      { module: "monitor_screenshots", action: "view" },
      { module: "monitor_policy", action: "view" },
      { module: "admin_discussions", action: "view" },
      { module: "admin_tickets", action: "view" },
    ],
  },
  {
    code: "manager",
    name: "Manager",
    cmsRole: "manager",
    isSystem: true,
    grants: [
      { module: "hrm_dashboard", action: "view" },
      // Nav/page visibility only — team-scope.js always scopes managers to their
      // direct reports regardless of this grant, so it can't widen access org-wide.
      { module: "hrm_employees", action: "view" },
      { module: "monitor_attendance", action: "view" },
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
    code: "bde",
    name: "BDE",
    cmsRole: "bde",
    isSystem: true,
    grants: [
      ...SALES_BDE_GRANTS,
      { module: "hrm_dashboard", action: "view" },
      { module: "hrm_my_attendance", action: "view" },
      { module: "hrm_my_leave", action: "view" },
      { module: "hrm_my_leave", action: "create" },
      { module: "hrm_my_wfh", action: "view" },
      { module: "hrm_my_wfh", action: "create" },
      { module: "hrm_my_holidays", action: "view" },
      { module: "hrm_my_payslips", action: "view" },
      { module: "hrm_holidays", action: "view" },
      { module: "admin_discussions", action: "view" },
      { module: "admin_tickets", action: "view" },
    ],
  },
  {
    code: "finance",
    name: "Finance",
    cmsRole: "finance",
    isSystem: true,
    grants: [
      ...FINANCE_GRANTS,
      { module: "hrm_dashboard", action: "view" },
      { module: "hrm_my_attendance", action: "view" },
      { module: "hrm_my_leave", action: "view" },
      { module: "hrm_my_leave", action: "create" },
      { module: "hrm_my_wfh", action: "view" },
      { module: "hrm_my_wfh", action: "create" },
      { module: "hrm_my_holidays", action: "view" },
      { module: "hrm_my_payslips", action: "view" },
      { module: "hrm_holidays", action: "view" },
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

/** Expand legacy umbrella `sales` grants into per-page sales_* modules. */
export async function migrateSalesPermissionModules() {
  const salesRows = await hrmPermissionsTable.find({ module: "sales" }).lean();
  for (const row of salesRows) {
    for (const mod of salesModules) {
      const exists = await hrmPermissionsTable.findOne({
        roleTemplateId: row.roleTemplateId,
        module: mod,
        action: row.action,
      }).lean();
      if (exists) continue;
      const id = await getNextSequence("hrm_permissions");
      await hrmPermissionsTable.create({
        id,
        roleTemplateId: row.roleTemplateId,
        module: mod,
        action: row.action,
      });
    }
    await hrmPermissionsTable.deleteOne({ id: row.id });
  }
}

function expandLegacySalesPermissionSet(set) {
  const actions = new Set();
  for (const key of set) {
    if (key.startsWith("sales:")) actions.add(key.slice("sales:".length));
  }
  for (const action of actions) {
    for (const mod of salesModules) {
      set.add(`${mod}:${action}`);
    }
  }
}

export async function ensureDefaultRoleTemplates() {
  await migrateLegacyPermissionModules();
  await migrateSalesPermissionModules();

  for (const tpl of DEFAULT_TEMPLATES) {
    let existing = await hrmRoleTemplatesTable.findOne({ code: tpl.code }).lean();
    if (!existing) {
      const id = await getNextSequence("hrm_role_templates");
      existing = await hrmRoleTemplatesTable.create({
        id,
        name: tpl.name,
        code: tpl.code,
        cmsRole: tpl.cmsRole ?? null,
        isSystem: tpl.isSystem,
      });
    } else if (tpl.cmsRole && !existing.cmsRole) {
      await hrmRoleTemplatesTable.updateOne({ id: existing.id }, { $set: { cmsRole: tpl.cmsRole } });
      existing = { ...existing, cmsRole: tpl.cmsRole };
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
      have.add(key);
    }

    if (tpl.grants !== "all" && existing.isSystem) {
      const expected = new Set(
        grants.map((g) => `${normalizePermissionModule(g.module)}:${g.action}`),
      );
      let pruned = false;
      for (const row of rows) {
        const key = `${normalizePermissionModule(row.module)}:${row.action}`;
        if (expected.has(key)) continue;
        await hrmPermissionsTable.deleteOne({ id: row.id });
        pruned = true;
      }
      if (pruned) evictPermissionCache(null);
    }
  }
}

async function templateIdForRole(role) {
  const code = defaultTemplateByRole[role];
  if (code) {
    const tpl = await hrmRoleTemplatesTable.findOne({ code }).lean();
    if (tpl) return tpl.id;
  }
  const byCms = await hrmRoleTemplatesTable.findOne({ cmsRole: role }).lean();
  return byCms?.id ?? null;
}

/** Assign default role template when role changes or user has none. */
export async function syncUserRoleTemplate(userId, role, options = {}) {
  const { explicitTemplateId, roleChanged = false } = options;
  await ensureDefaultRoleTemplates();

  // Explicit numeric template was written by the caller — refresh permission cache only.
  if (typeof explicitTemplateId === "number") {
    evictUserFromAuthCache(userId);
    evictPermissionCache(userId);
    return;
  }

  // explicitTemplateId === null means "use role default" (caller cleared custom template).
  const shouldAssignDefault = explicitTemplateId === null || roleChanged;

  const user = await usersTable
    .findOne({ id: userId }, { roleTemplateId: 1, hrmRoleTemplateId: 1 })
    .lean();
  if (!user) return;

  const hasTemplate = user.roleTemplateId != null || user.hrmRoleTemplateId != null;
  if (hasTemplate && !shouldAssignDefault) return;

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
const PERM_CACHE_MAX = 2000; // evict oldest entry when full to prevent unbounded growth
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

function validatePermissionList(permissionList) {
  if (!Array.isArray(permissionList)) {
    throw new Error("permissions must be an array");
  }
  const seen = new Set();
  for (const p of permissionList) {
    const mod = normalizePermissionModule(p?.module);
    const action = p?.action;
    if (!mod || !VALID_MODULES.has(mod)) {
      throw new Error(`Invalid permission module: ${p?.module ?? "(missing)"}`);
    }
    if (!action || !VALID_ACTIONS.has(action)) {
      throw new Error(`Invalid permission action: ${action ?? "(missing)"}`);
    }
    const key = `${mod}:${action}`;
    if (seen.has(key)) continue;
    seen.add(key);
  }
}

function normalizePermissionList(permissionList) {
  validatePermissionList(permissionList);
  const seen = new Set();
  const normalized = [];
  for (const p of permissionList) {
    const mod = normalizePermissionModule(p.module);
    const action = p.action;
    const key = `${mod}:${action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ module: mod, action });
  }
  return normalized;
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
    if (_permCache.size >= PERM_CACHE_MAX) _permCache.delete(_permCache.keys().next().value);
    _permCache.set(userId, entry);
    return entry;
  }

  await ensureTemplatesReady();
  const templateId = await resolveTemplateIdForUser(user);
  if (!templateId) {
    const entry = { set: new Set(), templateId: null, expiresAt: now + PERM_CACHE_TTL_MS };
    if (_permCache.size >= PERM_CACHE_MAX) _permCache.delete(_permCache.keys().next().value);
    _permCache.set(userId, entry);
    return entry;
  }

  const rows = await hrmPermissionsTable.find({ roleTemplateId: templateId }).lean();
  const set = new Set(rows.map((r) => permissionEntryKey(r.module, r.action)));
  expandLegacySalesPermissionSet(set);
  const entry = {
    set,
    templateId,
    expiresAt: now + PERM_CACHE_TTL_MS,
  };
  if (_permCache.size >= PERM_CACHE_MAX) _permCache.delete(_permCache.keys().next().value);
  _permCache.set(userId, entry);
  return entry;
}

async function resolveTemplateIdForUser(user) {
  const explicit = user.roleTemplateId ?? user.hrmRoleTemplateId;
  if (explicit) return explicit;

  const code = defaultTemplateByRole[user.role];
  if (code) {
    const tpl = await hrmRoleTemplatesTable.findOne({ code }).lean();
    if (tpl) return tpl.id;
  }

  const byCms = await hrmRoleTemplatesTable.findOne({ cmsRole: user.role }).lean();
  return byCms?.id ?? null;
}

export async function getPermissionsForUser(userId) {
  const user = await usersTable.findOne({ id: userId }, { role: 1 }).lean();
  if (!user) return { permissions: [], templateId: null, groups: cmsModuleGroups };

  const entry = await loadUserPermissionEntry(userId);
  if (!entry) return { permissions: [], templateId: null, groups: cmsModuleGroups };

  const permissions = [...entry.set].map((key) => {
    const sep = key.lastIndexOf(":");
    return { module: key.slice(0, sep), action: key.slice(sep + 1) };
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
  const key = permissionEntryKey(module, action);
  if (entry.set.has(key)) return true;
  const mod = normalizePermissionModule(module);
  if (mod.startsWith("sales_") && entry.set.has(permissionEntryKey("sales", action))) return true;
  return false;
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
  const existing = await hrmRoleTemplatesTable.findOne({ id: templateId }).lean();
  if (!existing) throw new Error("Role template not found");

  const normalized = normalizePermissionList(permissionList ?? []);
  const ids =
    normalized.length > 0
      ? await getNextSequenceRange("hrm_permissions", normalized.length)
      : [];

  await runInTx(async (session) => {
    const writeOpts = session ? { session } : {};
    await hrmPermissionsTable.deleteMany({ roleTemplateId: templateId }, writeOpts);
    if (normalized.length === 0) return;

    await hrmPermissionsTable.insertMany(
      normalized.map((p, index) => ({
        id: ids[index],
        roleTemplateId: templateId,
        module: p.module,
        action: p.action,
      })),
      writeOpts,
    );
  });

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

/** All valid user.role values including dynamic roles from DB templates. */
export async function listAllUserRoles() {
  await ensureTemplatesReady();
  const dynamic = await hrmRoleTemplatesTable
    .find({ cmsRole: { $nin: [null, ""] } })
    .select({ cmsRole: 1 })
    .lean();
  const extra = dynamic
    .map((t) => t.cmsRole)
    .filter((c) => c && !userRoles.includes(c));
  return [...new Set([...userRoles, ...extra])];
}

export async function isValidUserRole(role) {
  if (!role) return false;
  return (await listAllUserRoles()).includes(String(role).toLowerCase());
}

/** CMS login roles for Team form + assignee pickers (excludes client). */
export async function listAssignableCmsRoles() {
  await ensureTemplatesReady();
  const byValue = new Map(builtInAssignableCmsRoles.map((r) => [r.value, { ...r, isSystem: true }]));

  const templates = await hrmRoleTemplatesTable.find().sort({ name: 1 }).lean();
  for (const t of templates) {
    if (!t.cmsRole) continue;
    const existing = byValue.get(t.cmsRole);
    if (existing) {
      if (!existing.templateId) {
        byValue.set(t.cmsRole, {
          ...existing,
          templateId: t.id,
          isSystem: t.isSystem ?? existing.isSystem,
        });
      }
      continue;
    }
    byValue.set(t.cmsRole, {
      value: t.cmsRole,
      label: t.name,
      templateId: t.id,
      isSystem: t.isSystem,
    });
  }

  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function slugifyRoleCode(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export async function createRoleTemplate({ name, code, cmsRole, description, grants = [] }) {
  await ensureTemplatesReady();
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) throw new Error("Role name is required");

  const roleCode = (code ?? slugifyRoleCode(trimmedName)).trim().toLowerCase();
  if (!roleCode) throw new Error("Role code is required");

  const existing = await hrmRoleTemplatesTable.findOne({ code: roleCode }).lean();
  if (existing) throw new Error("A role with this code already exists");

  const normalizedCmsRole = cmsRole ? String(cmsRole).trim().toLowerCase() : null;
  if (normalizedCmsRole) {
    const clash = await hrmRoleTemplatesTable.findOne({ cmsRole: normalizedCmsRole }).lean();
    if (clash) throw new Error("This CMS login role is already assigned to another template");
    if (userRoles.includes(normalizedCmsRole) && defaultTemplateByRole[normalizedCmsRole]) {
      throw new Error("This CMS login role is reserved by a built-in role");
    }
  }

  const id = await getNextSequence("hrm_role_templates");
  const template = await hrmRoleTemplatesTable.create({
    id,
    name: trimmedName,
    code: roleCode,
    cmsRole: normalizedCmsRole,
    description: optionalString(description),
    isSystem: false,
  });

  if (grants.length > 0) {
    await updateRoleTemplatePermissions(id, grants);
  }

  return template.toObject();
}

function optionalString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function updateRoleTemplateMeta(templateId, { name, description, cmsRole }) {
  const existing = await hrmRoleTemplatesTable.findOne({ id: templateId }).lean();
  if (!existing) throw new Error("Role template not found");
  if (existing.isSystem && cmsRole !== undefined && cmsRole !== existing.cmsRole) {
    throw new Error("Cannot change CMS login role on system templates");
  }

  const updates = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw new Error("Role name is required");
    updates.name = trimmed;
  }
  if (description !== undefined) updates.description = optionalString(description);
  if (cmsRole !== undefined) {
    const normalized = cmsRole ? String(cmsRole).trim().toLowerCase() : null;
    if (normalized) {
      const clash = await hrmRoleTemplatesTable.findOne({
        cmsRole: normalized,
        id: { $ne: templateId },
      }).lean();
      if (clash) throw new Error("This CMS login role is already assigned to another template");
    }
    updates.cmsRole = normalized;
  }

  if (Object.keys(updates).length === 0) return existing;

  const updated = await hrmRoleTemplatesTable
    .findOneAndUpdate({ id: templateId }, { $set: updates }, { new: true })
    .lean();
  evictPermissionCache(null);
  return updated;
}

export async function deleteRoleTemplate(templateId) {
  const existing = await hrmRoleTemplatesTable.findOne({ id: templateId }).lean();
  if (!existing) throw new Error("Role template not found");
  if (existing.isSystem) throw new Error("System roles cannot be deleted");

  const usersOnTemplate = await usersTable.countDocuments({
    $or: [{ roleTemplateId: templateId }, { hrmRoleTemplateId: templateId }],
  });
  if (usersOnTemplate > 0) {
    throw new Error("Cannot delete: users are still assigned to this role template");
  }

  await hrmPermissionsTable.deleteMany({ roleTemplateId: templateId });
  await hrmRoleTemplatesTable.deleteOne({ id: templateId });
  evictPermissionCache(null);
}
