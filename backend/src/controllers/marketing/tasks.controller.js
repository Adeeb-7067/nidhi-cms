import {
  getNextSequence,
  marketingAccountsTable,
  marketingTasksTable,
  usersTable,
  clientsTable,
  projectsTable,
} from "../../models/schema/index.js";
import {
  MARKETING_TASK_CATEGORIES,
  MARKETING_TASK_PRIORITIES,
  MARKETING_TASK_STATUSES,
} from "../../constants/marketing.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";

import { paginateModel, toIso } from "../../utils/mongo-list.js";
import { IdLookupCache } from "../../lib/lookup-cache.js";
import {
  recordMarketingActivity,
  resolveScopedAccountId,
  assertDocAccount,
  getScopedDigitalUserAccess,
} from "../../services/marketing/helpers.js";

function formatTask(doc, displayName, assigneeName) {
  return {
    id: doc.id,
    accountId: doc.accountId,
    clientId: String(doc.accountId),
    clientName: displayName ?? "Unknown",
    companyId: doc.companyId,
    title: doc.title,
    category: doc.category,
    status: doc.status,
    priority: doc.priority,
    assigneeId: doc.assigneeId ?? null,
    assignee: assigneeName ?? null,
    deadline: toIso(doc.deadline)?.slice(0, 10) ?? null,
    estimatedHours: Number(doc.estimatedHours ?? 0),
    description: doc.description ?? null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

async function resolveTaskDisplayName(accountId, companyId) {
  const [account, company] = await Promise.all([
    marketingAccountsTable.findOne({ id: accountId }).lean(),
    clientsTable.findOne({ id: companyId }).lean(),
  ]);
  if (account?.projectId) {
    const project = await projectsTable.findOne({ id: account.projectId }).lean();
    if (project?.name) {
      return `${project.name} · ${company?.companyName ?? "Company"}`;
    }
  }
  return company?.companyName ?? "Unknown";
}

export async function listTasks(req, res) {
  const pagination = parsePagination(req.query);
  const access = await getScopedDigitalUserAccess(req.user);
  const query = { isDeleted: false };

  if (access.isScoped) {
    query.accountId = { $in: access.accountIds.length ? access.accountIds : [-1] };
  }
  if (req.query.accountId) query.accountId = Number(req.query.accountId);
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.category) query.category = String(req.query.category);
  if (req.query.assigneeId) query.assigneeId = Number(req.query.assigneeId);
  if (req.query.priority) query.priority = String(req.query.priority);

  const { items, total, page, limit } = await paginateModel(
    marketingTasksTable,
    query,
    pagination,
    { sort: { deadline: 1, updatedAt: -1 } },
  );

  const users = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean(),
  );
  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  const accounts = new IdLookupCache(async (ids) =>
    marketingAccountsTable.find({ id: { $in: ids } }).lean(),
  );
  const projects = new IdLookupCache(async (ids) =>
    projectsTable.find({ id: { $in: ids } }).lean(),
  );

  await accounts.preload(items.map((t) => t.accountId));
  await companies.preload(items.map((t) => t.companyId));
  await users.preload(items.map((t) => t.assigneeId).filter(Boolean));
  await projects.preload(
    items.map((t) => accounts.get(t.accountId)?.projectId).filter(Boolean),
  );

  res.json({
    tasks: items.map((t) => {
      const account = accounts.get(t.accountId);
      const project = account?.projectId ? projects.get(account.projectId) : null;
      const company = companies.get(t.companyId);
      const displayName = project?.name
        ? `${project.name} · ${company?.companyName ?? "Company"}`
        : company?.companyName;
      return formatTask(t, displayName, users.get(t.assigneeId)?.name);
    }),
    total,
    page,
    limit,
  });
}

export async function createTask(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId ?? body.clientId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  const title = optionalString(body.title);
  if (!title) badRequest("title is required.", "title");
  const category = optionalString(body.category);
  if (!category || !MARKETING_TASK_CATEGORIES.includes(category)) {
    badRequest("Valid category is required.", "category");
  }

  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");

  const status = MARKETING_TASK_STATUSES.includes(body.status) ? body.status : "not_started";
  const priority = MARKETING_TASK_PRIORITIES.includes(body.priority) ? body.priority : "medium";

  const id = await getNextSequence("marketing_tasks");
  const doc = await marketingTasksTable.create({
    id,
    accountId,
    companyId: account.companyId,
    title,
    category,
    status,
    priority,
    assigneeId: body.assigneeId != null ? Number(body.assigneeId) : null,
    deadline: body.deadline ? new Date(body.deadline) : null,
    estimatedHours: Number(body.estimatedHours ?? 0),
    description: optionalString(body.description),
    createdBy: req.user.id,
  });

  await recordMarketingActivity({
    accountId,
    companyId: account.companyId,
    message: `Task created: ${title}`,
    actorId: req.user.id,
    type: "task",
    entityType: "task",
    entityId: id,
  });

  const assignee = doc.assigneeId
    ? await usersTable.findOne({ id: doc.assigneeId }, { name: 1 }).lean()
    : null;
  const displayName = await resolveTaskDisplayName(accountId, account.companyId);

  res.status(201).json(formatTask(doc, displayName, assignee?.name));
}

export async function updateTask(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingTasksTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Task");
  assertDocAccount(doc, accountId);

  const body = req.body ?? {};
  const isSuperAdminOrHr = req.user.role === "super_admin" || req.user.role === "hr" || req.user.role === "manager";
  const isCreator = doc.createdBy != null && Number(doc.createdBy) === Number(req.user.id);
  const subRoleLower = (req.user.subType ?? "").toLowerCase();
  const isAccountManager = subRoleLower.includes("account_manager");
  const isFullEditAllowed = isSuperAdminOrHr || isCreator || isAccountManager;

  // Non-creator, non-manager assignees can ONLY update task status
  if (!isFullEditAllowed) {
    if (
      body.title !== undefined ||
      body.category !== undefined ||
      body.priority !== undefined ||
      (body.assigneeId !== undefined && Number(body.assigneeId) !== Number(doc.assigneeId)) ||
      body.deadline !== undefined ||
      body.estimatedHours !== undefined
    ) {
      forbidden("Assigned members can only update task status. Task details can only be edited by creator or manager.");
    }
  }

  if (body.title != null) {
    const title = optionalString(body.title);
    if (!title) badRequest("title is required.", "title");
    doc.title = title;
  }
  if (body.category != null) {
    if (!MARKETING_TASK_CATEGORIES.includes(body.category)) {
      badRequest("Invalid category.", "category");
    }
    doc.category = body.category;
  }
  if (body.status != null) {
    if (!MARKETING_TASK_STATUSES.includes(body.status)) badRequest("Invalid status.", "status");
    doc.status = body.status;
  }
  if (body.priority != null) {
    if (!MARKETING_TASK_PRIORITIES.includes(body.priority)) {
      badRequest("Invalid priority.", "priority");
    }
    doc.priority = body.priority;
  }
  if (body.assigneeId !== undefined && isFullEditAllowed) {
    doc.assigneeId = body.assigneeId == null ? null : Number(body.assigneeId);
  }
  if (body.deadline !== undefined && isFullEditAllowed) {
    doc.deadline = body.deadline ? new Date(body.deadline) : null;
  }
  if (body.estimatedHours !== undefined && isFullEditAllowed) doc.estimatedHours = Number(body.estimatedHours);
  if (body.description !== undefined && isFullEditAllowed) doc.description = optionalString(body.description);

  await doc.save();

  const assignee = doc.assigneeId
    ? await usersTable.findOne({ id: doc.assigneeId }, { name: 1 }).lean()
    : null;
  const displayName = await resolveTaskDisplayName(doc.accountId, doc.companyId);

  res.json(formatTask(doc, displayName, assignee?.name));
}

export async function deleteTask(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingTasksTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Task");
  assertDocAccount(doc, accountId);

  const isSuperAdminOrHr = req.user.role === "super_admin" || req.user.role === "hr" || req.user.role === "manager";
  const isCreator = doc.createdBy != null && Number(doc.createdBy) === Number(req.user.id);
  const subRoleLower = (req.user.subType ?? "").toLowerCase();
  const isAccountManager = subRoleLower.includes("account_manager");

  if (!isSuperAdminOrHr && !isCreator && !isAccountManager) {
    forbidden("Only task creators, account managers, or admins can delete tasks.");
  }

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  res.json({ ok: true });
}

