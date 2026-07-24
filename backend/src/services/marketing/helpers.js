import {
  getNextSequence,
  marketingActivityTable,
  marketingMediaItemsTable,
  marketingAccountsTable,
  projectsTable,
  projectMembersTable,
  clientsTable,
  usersTable,
} from "../../models/schema/index.js";
import { DEFAULT_MEDIA_SUBFOLDERS } from "../../constants/marketing.js";
import { toIso } from "../../utils/mongo-list.js";
import { badRequest, forbidden } from "../../utils/route-errors.js";
import {
  normalizeDigitalServices,
  normalizeSocialLinks,
  deriveMarketingPlatformEnums,
  mergeMarketingPlatformEnums,
} from "../../utils/digital-project-fields.js";
import { normalizeSubRole, isDigitalElevatedLead, shouldRestrictToOwnDigitalTasks, resolveDigitalTaskAssigneeId } from "../../middlewares/digital-access.js";
import { assertProjectMember } from "../work-assignments.js";

export async function recordMarketingActivity({
  accountId = null,
  companyId = null,
  message,
  actorId,
  type,
  entityType = null,
  entityId = null,
}) {
  const id = await getNextSequence("marketing_activity");
  await marketingActivityTable.create({
    id,
    accountId,
    companyId,
    message,
    actorId,
    type,
    entityType,
    entityId,
  });
}

/**
 * Read accountId from query or body. When `required`, missing/invalid values 400.
 * Used to bind mutate-by-ID operations to a digital account and prevent cross-account IDOR.
 */
export function resolveScopedAccountId(req, { required = false } = {}) {
  const raw = req.query?.accountId ?? req.body?.accountId;
  if (raw == null || raw === "") {
    if (required) badRequest("accountId is required.", "accountId");
    return null;
  }
  const accountId = Number(raw);
  if (!Number.isFinite(accountId)) badRequest("Invalid accountId.", "accountId");
  return accountId;
}

/** Membership-scoped users cannot touch accounts outside their digital projects. */
export async function assertScopedAccountAccess(user, accountId) {
  if (accountId == null || !Number.isFinite(Number(accountId))) {
    badRequest("accountId is required.", "accountId");
  }
  const access = await getScopedDigitalUserAccess(user);
  if (access.isScoped && !(access.accountIds ?? []).includes(Number(accountId))) {
    forbidden("You do not have access to this digital account.");
  }
  return access;
}

/**
 * Resolve accountId from the request and enforce membership scope.
 * Prefer this on every mutate-by-id path (prevents cross-account IDOR).
 */
export async function requireScopedAccountId(req, { required = true } = {}) {
  const accountId = resolveScopedAccountId(req, { required });
  if (accountId != null) {
    await assertScopedAccountAccess(req.user, accountId);
  }
  return accountId;
}

/**
 * Apply digital account scope to a Mongo query.
 * Requested accountId must be inside the user's scope when scoped.
 */
export async function applyScopedAccountQuery(query, user, requestedAccountId) {
  const access = await getScopedDigitalUserAccess(user);
  if (requestedAccountId != null && requestedAccountId !== "") {
    const aid = Number(requestedAccountId);
    if (!Number.isFinite(aid)) badRequest("Invalid accountId.", "accountId");
    if (access.isScoped && !(access.accountIds ?? []).includes(aid)) {
      forbidden("You do not have access to this digital account.");
    }
    query.accountId = aid;
    return access;
  }
  if (access.isScoped) {
    query.accountId = { $in: access.accountIds?.length ? access.accountIds : [-1] };
  }
  return access;
}

/** Ensure a marketing document belongs to the scoped digital account. */
export function assertDocAccount(doc, accountId, { required = true } = {}) {
  if (!doc) return;
  if (accountId == null) {
    if (required) badRequest("accountId is required.", "accountId");
    return;
  }
  if (Number(doc.accountId) !== Number(accountId)) {
    forbidden("This resource does not belong to the selected digital account.");
  }
}

/** Create root + standard subfolders for a new digital account vault. */
export async function bootstrapAccountMediaVault(accountId, companyId, userId, rootName = "This PC") {
  return ensureAccountMediaVault(accountId, companyId, userId, { rootName });
}

/**
 * Idempotent: ensure root folder + default subfolders exist for a digital account.
 * Root folder is named after the Digital project so it shows in Media folder tree.
 */
export async function ensureAccountMediaVault(
  accountId,
  companyId,
  userId,
  { rootName = "This PC" } = {},
) {
  const aid = Number(accountId);
  const cid = Number(companyId);
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) return null;

  const desiredName = (rootName && String(rootName).trim()) || "This PC";

  let root = await marketingMediaItemsTable.findOne({
    accountId: aid,
    parentId: null,
    kind: "folder",
    isDeleted: false,
  });

  if (!root) {
    const rootId = await getNextSequence("marketing_media");
    root = await marketingMediaItemsTable.create({
      id: rootId,
      accountId: aid,
      companyId: cid,
      parentId: null,
      name: desiredName,
      kind: "folder",
      createdBy: userId,
    });
  } else if (desiredName && root.name !== desiredName) {
    // Rename legacy "This PC" (or stale name) to the Digital project name
    root.name = desiredName;
    await root.save();
  }

  const rootId = root.id;
  const existingSubs = await marketingMediaItemsTable
    .find({
      accountId: aid,
      parentId: rootId,
      kind: "folder",
      isDeleted: false,
    })
    .select({ name: 1 })
    .lean();
  const have = new Set(existingSubs.map((f) => f.name));

  for (const name of DEFAULT_MEDIA_SUBFOLDERS) {
    if (have.has(name)) continue;
    const id = await getNextSequence("marketing_media");
    await marketingMediaItemsTable.create({
      id,
      accountId: aid,
      companyId: cid,
      parentId: rootId,
      name,
      kind: "folder",
      createdBy: userId,
    });
  }

  return rootId;
}

/**
 * One marketing account per digital project — powers Tasks/Media/Calendar scoping.
 * Idempotent: returns existing active account when already linked, and always
 * ensures the Media vault folders exist for that workspace.
 */
export async function ensureDigitalAccountForProject(project, userId) {
  if (!project || project.type !== "digital") return null;
  const projectId = Number(project.id);
  const companyId = Number(project.companyId ?? project.clientId);
  if (!Number.isFinite(projectId) || !Number.isFinite(companyId)) return null;

  const vaultRootName = optionalProjectFolderName(project);
  const digitalServices = normalizeDigitalServices(project.digitalServices);
  const socialLinks = normalizeSocialLinks(project.socialLinks);
  const derivedPlatforms = deriveMarketingPlatformEnums(
    digitalServices,
    socialLinks,
    project.techStack,
  );

  const existing = await marketingAccountsTable
    .findOne({ projectId, isDeleted: false, status: { $ne: "ended" } });
  if (existing) {
    // Keep workspace-bound platforms; never shrink to a single derived channel (e.g. IG-only).
    const nextPlatforms = mergeMarketingPlatformEnums(existing.platforms, derivedPlatforms);
    existing.companyId = companyId;
    existing.digitalServices = digitalServices;
    existing.socialLinks = socialLinks;
    existing.platforms = nextPlatforms;
    await existing.save();
    const lean = existing.toObject ? existing.toObject() : existing;
    await ensureAccountMediaVault(lean.id, companyId, userId, {
      rootName: vaultRootName,
    });
    return lean;
  }

  const soft = await marketingAccountsTable.findOne({ projectId, isDeleted: true });
  if (soft) {
    soft.isDeleted = false;
    soft.deletedAt = null;
    soft.status = "active";
    soft.companyId = companyId;
    soft.digitalServices = digitalServices;
    soft.socialLinks = socialLinks;
    soft.platforms = mergeMarketingPlatformEnums(soft.platforms, derivedPlatforms);
    await soft.save();
    await ensureAccountMediaVault(soft.id, companyId, userId, {
      rootName: vaultRootName,
    });
    return soft.toObject ? soft.toObject() : soft;
  }

  const id = await getNextSequence("marketing_accounts");
  const doc = await marketingAccountsTable.create({
    id,
    companyId,
    projectId,
    package: "standard",
    platforms: derivedPlatforms,
    digitalServices,
    socialLinks,
    monthlyBudgetInr: 0,
    status: "active",
    createdBy: userId,
  });

  await ensureAccountMediaVault(id, companyId, userId, { rootName: vaultRootName });
  await recordMarketingActivity({
    accountId: id,
    companyId,
    message: `Digital workspace linked for project "${project.name ?? projectId}"`,
    actorId: userId,
    type: "account",
    entityType: "account",
    entityId: id,
  });

  return doc.toObject ? doc.toObject() : doc;
}

function optionalProjectFolderName(project) {
  const name = typeof project?.name === "string" ? project.name.trim() : "";
  return name || "This PC";
}

/** Soft-delete the marketing account tied to a project. */
export async function softDeleteDigitalAccountForProject(projectId) {
  const id = Number(projectId);
  if (!Number.isFinite(id)) return;
  await marketingAccountsTable.updateMany(
    { projectId: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), status: "ended" } },
  );
}

/** Backfill accounts for every digital project missing one. */
export async function ensureAccountsForAllDigitalProjects(userId) {
  const projects = await projectsTable
    .find({ type: "digital" })
    .select({ id: 1, name: 1, type: 1, companyId: 1, clientId: 1 })
    .lean();
  const digitalIds = projects.map((p) => p.id);

  // Drop workspaces that are no longer linked to a digital project.
  await marketingAccountsTable.updateMany(
    {
      isDeleted: false,
      projectId: { $type: "number", $nin: digitalIds.length ? digitalIds : [-1] },
    },
    { $set: { isDeleted: true, deletedAt: new Date(), status: "ended" } },
  );

  if (!projects.length) return [];

  const existing = await marketingAccountsTable
    .find({
      projectId: { $in: digitalIds },
      isDeleted: false,
      status: { $ne: "ended" },
    })
    .select({ projectId: 1 })
    .lean();
  const have = new Set(existing.map((e) => e.projectId));

  const created = [];
  for (const project of projects) {
    // Always run ensure so Media vault folders exist even if the account row already did.
    const account = await ensureDigitalAccountForProject(project, userId);
    if (account && !have.has(project.id)) created.push(account);
  }
  return created;
}

export function formatAccount(doc, company, manager, project = null, options = {}) {
  const includeClientBudget = options.includeClientBudget === true;
  return {
    id: doc.id,
    companyId: doc.companyId,
    companyName: company?.companyName ?? "Unknown",
    projectName: project?.name ?? null,
    industry: doc.industry ?? company?.industry ?? "",
    city: doc.city ?? "",
    projectId: doc.projectId ?? null,
    package: doc.package,
    accountManagerId: doc.accountManagerId ?? null,
    accountManager: manager?.name ?? null,
    platforms: doc.platforms ?? [],
    digitalServices: doc.digitalServices ?? {},
    socialLinks: doc.socialLinks ?? {},
    /** Client retainer — only for super_admin / Account Manager (omit otherwise). */
    monthlyBudgetInr: includeClientBudget ? Number(doc.monthlyBudgetInr ?? 0) : null,
    renewalDate: toIso(doc.renewalDate)?.slice(0, 10) ?? null,
    status: doc.status,
    performanceScore: Number(doc.performanceScore ?? 0),
    notes: doc.notes ?? null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

/**
 * Accepts auth user `{ role, subType }` or legacy role string.
 * Commercial package / retainer: super_admin or digital Account Manager.
 */
function resolveCommercialUser(userOrRole) {
  if (userOrRole == null) return null;
  if (typeof userOrRole === "string") return { role: userOrRole };
  return userOrRole;
}

/** Client monthly retainer / commercial package — super_admin or Account Manager. */
export function canManageMarketingClientCommercial(userOrRole) {
  const user = resolveCommercialUser(userOrRole);
  if (!user?.role) return false;
  if (user.role === "super_admin") return true;
  if (user.role === "digital") {
    return normalizeSubRole(user.subType) === "account_manager";
  }
  return false;
}

export function canViewMarketingClientBudget(userOrRole) {
  return canManageMarketingClientCommercial(userOrRole);
}

/** True when project-member subType is Account Manager (roster role on that project). */
export function isProjectAccountManagerSubType(subType) {
  return normalizeSubRole(subType) === "account_manager";
}

/**
 * Can assign / manage team tasks on this digital workspace:
 * global digital lead, marketing accountManagerId, or project roster "Account Manager".
 */
export async function canManageDigitalTasksForAccount(user, account) {
  if (!user) return false;
  if (isDigitalElevatedLead(user)) return true;
  if (
    account?.accountManagerId != null &&
    Number(account.accountManagerId) === Number(user.id)
  ) {
    return true;
  }
  if (account?.projectId == null || user.id == null) return false;
  const member = await projectMembersTable
    .findOne({ projectId: Number(account.projectId), userId: Number(user.id) })
    .lean();
  return isProjectAccountManagerSubType(member?.subType);
}

/** Account ids where this user is project/workspace Account Manager (not global lead). */
export async function getAccountIdsWhereUserIsProjectAccountManager(user) {
  if (!user?.id || isDigitalElevatedLead(user)) return [];
  const uid = Number(user.id);
  const [rosterAm, managedAccounts] = await Promise.all([
    projectMembersTable.find({ userId: uid }).select({ projectId: 1, subType: 1 }).lean(),
    marketingAccountsTable
      .find({ accountManagerId: uid, isDeleted: false })
      .select({ id: 1 })
      .lean(),
  ]);
  const amProjectIds = rosterAm
    .filter((m) => isProjectAccountManagerSubType(m.subType))
    .map((m) => m.projectId)
    .filter((id) => id != null);
  const fromRoster = amProjectIds.length
    ? await marketingAccountsTable
        .find({ projectId: { $in: amProjectIds }, isDeleted: false })
        .select({ id: 1 })
        .lean()
    : [];
  return [...new Set([...managedAccounts, ...fromRoster].map((a) => a.id))];
}

/**
 * Craft digital / freelancers: own assignments only, except full board on AM accounts.
 * Mutates `query` in place (same pattern as listTasks).
 */
export async function applyCraftAssigneeVisibility(query, user) {
  if (!shouldRestrictToOwnDigitalTasks(user)) return;
  const amAccountIds = await getAccountIdsWhereUserIsProjectAccountManager(user);
  if (amAccountIds.length === 0) {
    query.assigneeId = Number(user.id);
    return;
  }
  query.$or = [
    { assigneeId: Number(user.id) },
    { accountId: { $in: amAccountIds } },
  ];
}

/**
 * Soft-delete gate: elevated lead, item creator, or project/workspace Account Manager.
 */
export async function canDeleteMarketingOwnedItem(user, doc) {
  if (!user || !doc) return false;
  if (isDigitalElevatedLead(user)) return true;
  if (doc.createdBy != null && Number(doc.createdBy) === Number(user.id)) return true;
  const account = await marketingAccountsTable
    .findOne({ id: doc.accountId, isDeleted: false })
    .lean();
  return canManageDigitalTasksForAccount(user, account);
}

/**
 * Resolve assignee for queue/calendar items: craft → self; leads/AM → optional id + project member.
 */
export async function resolveMarketingAssigneeForAccount(user, account, requestedAssigneeId) {
  const allowAssignOthers = await canManageDigitalTasksForAccount(user, account);
  const assigneeId = resolveDigitalTaskAssigneeId(user, requestedAssigneeId, {
    allowAssignOthers,
  });
  if (assigneeId != null && allowAssignOthers && account?.projectId != null) {
    await assertProjectMember(assigneeId, account.projectId);
  }
  return assigneeId;
}

export async function loadCompany(companyId) {
  return clientsTable.findOne({ id: companyId }).lean();
}

export async function loadUser(userId) {
  if (userId == null) return null;
  return usersTable.findOne({ id: userId }, { id: 1, name: 1, employeeId: 1 }).lean();
}

export async function loadProject(projectId) {
  if (projectId == null) return null;
  return projectsTable.findOne({ id: projectId }).lean();
}

/** Display label: "Project · Company" for digital workspaces. */
export function digitalWorkspaceLabel(project, company) {
  if (project?.name) {
    return `${project.name} · ${company?.companyName ?? "Company"}`;
  }
  return company?.companyName ?? "Unknown";
}

/**
 * Map accountId → "Project · Company" for list responses.
 * @param {number[]} accountIds
 * @returns {Promise<Map<number, string>>}
 */
export async function loadWorkspaceLabelsByAccountIds(accountIds) {
  const ids = [...new Set((accountIds ?? []).map(Number).filter(Number.isFinite))];
  const labelByAccountId = new Map();
  if (!ids.length) return labelByAccountId;

  const accounts = await marketingAccountsTable.find({ id: { $in: ids } }).lean();
  const projectIds = [...new Set(accounts.map((a) => a.projectId).filter(Boolean))];
  const companyIds = [...new Set(accounts.map((a) => a.companyId).filter(Boolean))];
  const [projects, companies] = await Promise.all([
    projectIds.length
      ? projectsTable.find({ id: { $in: projectIds } }).lean()
      : [],
    companyIds.length
      ? clientsTable.find({ id: { $in: companyIds } }).lean()
      : [],
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const companyById = new Map(companies.map((c) => [c.id, c]));
  for (const a of accounts) {
    labelByAccountId.set(
      a.id,
      digitalWorkspaceLabel(projectById.get(a.projectId), companyById.get(a.companyId)),
    );
  }
  return labelByAccountId;
}

export function inferMediaKind(filename, mimetype) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return { kind: "image", extension: ext || null };
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "webm", "avi"].includes(ext)) {
    return { kind: "video", extension: ext || null };
  }
  if (
    mime.includes("pdf") ||
    mime.includes("document") ||
    mime.includes("sheet") ||
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)
  ) {
    return { kind: "document", extension: ext || null };
  }
  return { kind: "file", extension: ext || null };
}

/**
 * Scoped marketing access for digital specialists, freelancers, and BDEs on assigned work.
 * Project visibility is membership (PM or ProjectMembers) plus, for BDEs, digital projects
 * on customers they own — so sales can open the marketing hub for their deals.
 * Marketing accounts / companies are derived from those projects.
 */
export async function getScopedDigitalUserAccess(user) {
  // Only super_admin is unscoped for marketing. HR uses org pickers elsewhere but
  // must not receive organization-wide marketing analytics (Hybrid RBAC).
  if (user?.role === "super_admin") {
    return { isScoped: false, accountIds: null, projectIds: null, companyIds: null };
  }

  const needsScope =
    user?.role === "digital" ||
    user?.role === "freelancer" ||
    user?.role === "bde" ||
    user?.role === "hr";
  if (!needsScope) {
    return { isScoped: false, accountIds: null, projectIds: null, companyIds: null };
  }

  const userId = Number(user.id);
  const digitalOnly =
    user.role === "digital" || user.role === "bde" || user.role === "hr";

  const pmProjects = await projectsTable
    .find(
      {
        pmId: userId,
        isDeleted: { $ne: true },
        ...(digitalOnly ? { type: "digital" } : {}),
      },
      { id: 1, companyId: 1, clientId: 1 },
    )
    .lean();
  const memberRows = await projectMembersTable.find({ userId }).select({ projectId: 1 }).lean();
  const memberProjectIds = memberRows.map((r) => r.projectId);
  const memberProjects = memberProjectIds.length
    ? await projectsTable
        .find(
          {
            id: { $in: memberProjectIds },
            isDeleted: { $ne: true },
            ...(digitalOnly ? { type: "digital" } : {}),
          },
          { id: 1, companyId: 1, clientId: 1 },
        )
        .lean()
    : [];

  let ownedCustomerProjects = [];
  if (user.role === "bde") {
    const { findBdeOwnedCustomerIds } = await import(
      "../../utils/sales-bde-customer-scope.js"
    );
    const ownedCompanyIds = await findBdeOwnedCustomerIds(clientsTable, userId);
    if (ownedCompanyIds.length) {
      ownedCustomerProjects = await projectsTable
        .find(
          {
            type: "digital",
            isDeleted: { $ne: true },
            $or: [
              { companyId: { $in: ownedCompanyIds } },
              { clientId: { $in: ownedCompanyIds } },
            ],
          },
          { id: 1, companyId: 1, clientId: 1 },
        )
        .lean();
    }
  }

  const projectIds = [
    ...new Set([
      ...pmProjects.map((p) => p.id),
      ...memberProjects.map((p) => p.id),
      ...ownedCustomerProjects.map((p) => p.id),
    ]),
  ];

  const projectAccounts = projectIds.length
    ? await marketingAccountsTable
        .find({ isDeleted: false, projectId: { $in: projectIds } }, { id: 1, companyId: 1 })
        .lean()
    : [];

  const accountIds = [...new Set(projectAccounts.map((a) => a.id))];

  const companyIds = [
    ...new Set(
      [
        ...pmProjects.map((p) => p.companyId || p.clientId),
        ...memberProjects.map((p) => p.companyId || p.clientId),
        ...ownedCustomerProjects.map((p) => p.companyId || p.clientId),
        ...projectAccounts.map((a) => a.companyId),
      ].filter(Boolean),
    ),
  ];

  return { isScoped: true, accountIds, projectIds, companyIds, userId };
}
