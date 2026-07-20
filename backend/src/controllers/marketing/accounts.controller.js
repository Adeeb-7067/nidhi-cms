import {
  getNextSequence,
  marketingAccountsTable,
  marketingTasksTable,
  marketingCampaignsTable,
  clientsTable,
  projectsTable,
  usersTable,
} from "../../models/schema/index.js";
import { PACKAGE_QUOTAS } from "../../constants/marketing.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";
import { paginateModel } from "../../utils/mongo-list.js";
import { IdLookupCache } from "../../lib/lookup-cache.js";
import {
  bootstrapAccountMediaVault,
  ensureAccountsForAllDigitalProjects,
  formatAccount,
  loadCompany,
  loadUser,
  loadProject,
  loadWorkspaceLabelsByAccountIds,
  recordMarketingActivity,
} from "../../services/marketing/helpers.js";
import {
  MARKETING_PACKAGES,
  MARKETING_PLATFORMS,
  MARKETING_ACCOUNT_STATUSES,
} from "../../constants/marketing.js";

async function formatAccountRow(doc) {
  const [company, manager, project] = await Promise.all([
    loadCompany(doc.companyId),
    loadUser(doc.accountManagerId),
    loadProject(doc.projectId),
  ]);
  return formatAccount(doc, company, manager, project);
}

export async function listAccounts(req, res) {
  // Drop legacy unique-per-company index if present (now unique per project).
  try {
    await marketingAccountsTable.collection.dropIndex("companyId_1");
  } catch {
    /* index may already be gone */
  }

  // Ensure every digital project has a workspace account (Tasks/Media pickers).
  if (req.user?.id) {
    try {
      await ensureAccountsForAllDigitalProjects(req.user.id);
    } catch (err) {
      console.warn("[marketing] ensureAccountsForAllDigitalProjects:", err?.message ?? err);
    }
  }

  const pagination = parsePagination(req.query);
  // Only workspaces linked to type=digital projects (never development/maintenance).
  const digitalProjectIds = (
    await projectsTable.find({ type: "digital" }).select({ id: 1 }).lean()
  ).map((p) => p.id);
  const query = {
    isDeleted: false,
    projectId: { $in: digitalProjectIds.length ? digitalProjectIds : [-1] },
  };
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.package) query.package = String(req.query.package);
  if (req.query.projectId) {
    const pid = Number(req.query.projectId);
    query.projectId = digitalProjectIds.includes(pid) ? pid : -1;
  }
  if (req.query.search) {
    const q = String(req.query.search).trim();
    const [companies, projects] = await Promise.all([
      clientsTable
        .find({ companyName: { $regex: q, $options: "i" } })
        .select({ id: 1 })
        .lean(),
      projectsTable
        .find({
          type: "digital",
          id: { $in: digitalProjectIds },
          name: { $regex: q, $options: "i" },
        })
        .select({ id: 1 })
        .lean(),
    ]);
    const companyIds = companies.map((c) => c.id);
    const projectIds = projects.map((p) => p.id);
    query.$and = [
      { projectId: query.projectId },
      {
        $or: [
          { companyId: { $in: companyIds } },
          { projectId: { $in: projectIds } },
        ],
      },
    ];
    delete query.projectId;
  }

  const { items, total, page, limit } = await paginateModel(
    marketingAccountsTable,
    query,
    pagination,
    { sort: { updatedAt: -1 } },
  );

  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  const users = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean(),
  );
  const projects = new IdLookupCache(async (ids) =>
    projectsTable.find({ id: { $in: ids } }).lean(),
  );
  await Promise.all([
    companies.preload(items.map((a) => a.companyId)),
    users.preload(items.map((a) => a.accountManagerId).filter(Boolean)),
    projects.preload(items.map((a) => a.projectId).filter(Boolean)),
  ]);

  res.json({
    accounts: items.map((a) =>
      formatAccount(
        a,
        companies.get(a.companyId),
        users.get(a.accountManagerId),
        projects.get(a.projectId),
      ),
    ),
    total,
    page,
    limit,
  });
}

export async function getAccountById(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await marketingAccountsTable.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("Digital account");

  const [account, usage] = await Promise.all([
    formatAccountRow(doc),
    getDeliverableUsage(id, doc.package),
  ]);

  res.json({ ...account, usage });
}

async function getDeliverableUsage(accountId, pkg) {
  const quota = PACKAGE_QUOTAS[pkg] ?? PACKAGE_QUOTAS.standard;
  const completed = await marketingTasksTable.find({
    accountId,
    isDeleted: false,
    status: "completed",
  }).lean();

  const countCat = (cat) => completed.filter((t) => t.category === cat).length;
  return {
    graphics: { used: countCat("graphics"), quota: quota.graphics },
    ugc: { used: Math.min(countCat("video"), quota.ugc), quota: quota.ugc },
    reels: { used: Math.min(countCat("video"), quota.reels), quota: quota.reels },
    blogs: { used: countCat("content"), quota: quota.blogs },
  };
}

export async function createAccount(req, res) {
  const body = req.body ?? {};
  const projectId = body.projectId != null ? Number(body.projectId) : null;
  if (!Number.isFinite(projectId)) {
    badRequest("projectId is required for a digital workspace.", "projectId");
  }

  const project = await projectsTable.findOne({ id: projectId }).lean();
  if (!project) notFound("Project");
  if (project.type !== "digital") {
    badRequest("Linked project must have type digital.", "projectId");
  }

  const companyId = Number(
    body.companyId ?? body.clientId ?? project.companyId ?? project.clientId,
  );
  if (!Number.isFinite(companyId)) badRequest("companyId is required.", "companyId");
  if (
    Number(project.clientId) !== companyId &&
    Number(project.companyId) !== companyId
  ) {
    badRequest("Project does not belong to this company.", "projectId");
  }

  const company = await loadCompany(companyId);
  if (!company) notFound("Company");

  const existing = await marketingAccountsTable
    .findOne({ projectId, isDeleted: false, status: { $ne: "ended" } })
    .lean();
  if (existing) {
    badRequest("This digital project already has a workspace.", "projectId");
  }

  const pkg = optionalString(body.package) ?? "standard";
  if (!MARKETING_PACKAGES.includes(pkg)) badRequest("Invalid package.", "package");

  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p) => MARKETING_PLATFORMS.includes(p))
    : [];

  const id = await getNextSequence("marketing_accounts");
  const doc = await marketingAccountsTable.create({
    id,
    companyId,
    projectId,
    package: pkg,
    accountManagerId: body.accountManagerId != null ? Number(body.accountManagerId) : null,
    platforms,
    monthlyBudgetInr: Number(body.monthlyBudgetInr ?? 0),
    renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
    status: MARKETING_ACCOUNT_STATUSES.includes(body.status) ? body.status : "active",
    industry: optionalString(body.industry),
    city: optionalString(body.city),
    performanceScore: Number(body.performanceScore ?? 0),
    notes: optionalString(body.notes),
    createdBy: req.user.id,
  });

  await bootstrapAccountMediaVault(id, companyId, req.user.id, project.name || "This PC");
  await recordMarketingActivity({
    accountId: id,
    companyId,
    message: `Digital workspace created for ${project.name}`,
    actorId: req.user.id,
    type: "account",
    entityType: "account",
    entityId: id,
  });

  res.status(201).json(await formatAccountRow(doc.toObject ? doc.toObject() : doc));
}

export async function updateAccount(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await marketingAccountsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Digital account");

  const body = req.body ?? {};
  if (body.package != null) {
    if (!MARKETING_PACKAGES.includes(body.package)) badRequest("Invalid package.", "package");
    doc.package = body.package;
  }
  if (body.status != null) {
    if (!MARKETING_ACCOUNT_STATUSES.includes(body.status)) badRequest("Invalid status.", "status");
    doc.status = body.status;
  }
  if (body.accountManagerId !== undefined) {
    doc.accountManagerId =
      body.accountManagerId == null ? null : Number(body.accountManagerId);
  }
  if (body.platforms != null) {
    doc.platforms = Array.isArray(body.platforms)
      ? body.platforms.filter((p) => MARKETING_PLATFORMS.includes(p))
      : doc.platforms;
  }
  if (body.monthlyBudgetInr != null) doc.monthlyBudgetInr = Number(body.monthlyBudgetInr);
  if (body.renewalDate !== undefined) {
    doc.renewalDate = body.renewalDate ? new Date(body.renewalDate) : null;
  }
  if (body.industry !== undefined) doc.industry = optionalString(body.industry);
  if (body.city !== undefined) doc.city = optionalString(body.city);
  if (body.performanceScore != null) doc.performanceScore = Number(body.performanceScore);
  if (body.notes !== undefined) doc.notes = optionalString(body.notes);

  if (body.projectId !== undefined) {
    if (body.projectId == null) {
      badRequest("Digital workspace must stay linked to a project.", "projectId");
    }
    const projectId = Number(body.projectId);
    const project = await projectsTable.findOne({ id: projectId }).lean();
    if (!project) notFound("Project");
    if (project.type !== "digital") {
      badRequest("Linked project must have type digital.", "projectId");
    }
    if (
      Number(project.clientId) !== Number(doc.companyId) &&
      Number(project.companyId) !== Number(doc.companyId)
    ) {
      badRequest("Project does not belong to this company.", "projectId");
    }
    const clash = await marketingAccountsTable
      .findOne({
        projectId,
        isDeleted: false,
        status: { $ne: "ended" },
        id: { $ne: id },
      })
      .lean();
    if (clash) badRequest("Another workspace already uses this project.", "projectId");
    doc.projectId = projectId;
  }

  await doc.save();
  res.json(await formatAccountRow(doc.toObject ? doc.toObject() : doc));
}

export async function deleteAccount(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await marketingAccountsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Digital account");
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.status = "ended";
  await doc.save();
  res.json({ ok: true });
}

/** Campaigns for one digital workspace (used by project/account detail). */
export async function listAccountCampaigns(req, res) {
  const accountId = parseIdParam(req.params.id);
  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");

  const pagination = parsePagination(req.query);
  const query = { isDeleted: false, accountId };
  if (req.query.network) query.network = String(req.query.network);

  const { items, total, page, limit } = await paginateModel(
    marketingCampaignsTable,
    query,
    pagination,
    { sort: { updatedAt: -1 } },
  );

  const labels = await loadWorkspaceLabelsByAccountIds([accountId]);
  const label = labels.get(accountId) ?? "Unknown";

  res.json({
    campaigns: items.map((c) => ({
      id: String(c.id),
      name: c.name,
      clientName: label,
      accountId: c.accountId,
      companyId: c.companyId,
      network: c.network,
      status: c.status,
      budgetInr: c.budgetInr ?? 0,
      roas: c.roas ?? 0,
      objective: c.objective ?? null,
      googleType: c.googleType ?? null,
    })),
    total,
    page,
    limit,
  });
}
