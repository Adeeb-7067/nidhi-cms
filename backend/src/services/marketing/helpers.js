import {
  getNextSequence,
  marketingActivityTable,
  marketingMediaItemsTable,
  marketingAccountsTable,
  projectsTable,
  clientsTable,
  usersTable,
} from "../../models/schema/index.js";
import { DEFAULT_MEDIA_SUBFOLDERS } from "../../constants/marketing.js";
import { toIso } from "../../utils/mongo-list.js";
import { badRequest, forbidden } from "../../utils/route-errors.js";

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
export async function bootstrapAccountMediaVault(accountId, companyId, userId) {
  const rootId = await getNextSequence("marketing_media");
  await marketingMediaItemsTable.create({
    id: rootId,
    accountId,
    companyId,
    parentId: null,
    name: "This PC",
    kind: "folder",
    createdBy: userId,
  });

  for (const name of DEFAULT_MEDIA_SUBFOLDERS) {
    const id = await getNextSequence("marketing_media");
    await marketingMediaItemsTable.create({
      id,
      accountId,
      companyId,
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
 * Idempotent: returns existing active account when already linked.
 */
export async function ensureDigitalAccountForProject(project, userId) {
  if (!project || project.type !== "digital") return null;
  const projectId = Number(project.id);
  const companyId = Number(project.companyId ?? project.clientId);
  if (!Number.isFinite(projectId) || !Number.isFinite(companyId)) return null;

  const existing = await marketingAccountsTable
    .findOne({ projectId, isDeleted: false, status: { $ne: "ended" } })
    .lean();
  if (existing) return existing;

  const soft = await marketingAccountsTable.findOne({ projectId, isDeleted: true });
  if (soft) {
    soft.isDeleted = false;
    soft.deletedAt = null;
    soft.status = "active";
    soft.companyId = companyId;
    await soft.save();
    const hasVault = await marketingMediaItemsTable.exists({
      accountId: soft.id,
      parentId: null,
      isDeleted: false,
    });
    if (!hasVault) {
      await bootstrapAccountMediaVault(soft.id, companyId, userId);
    }
    return soft.toObject ? soft.toObject() : soft;
  }

  const id = await getNextSequence("marketing_accounts");
  const doc = await marketingAccountsTable.create({
    id,
    companyId,
    projectId,
    package: "standard",
    platforms: [],
    monthlyBudgetInr: 0,
    status: "active",
    createdBy: userId,
  });

  await bootstrapAccountMediaVault(id, companyId, userId);
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
    if (have.has(project.id)) continue;
    const account = await ensureDigitalAccountForProject(project, userId);
    if (account) created.push(account);
  }
  return created;
}

export function formatAccount(doc, company, manager, project = null) {
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
    monthlyBudgetInr: Number(doc.monthlyBudgetInr ?? 0),
    renewalDate: toIso(doc.renewalDate)?.slice(0, 10) ?? null,
    status: doc.status,
    performanceScore: Number(doc.performanceScore ?? 0),
    notes: doc.notes ?? null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
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
