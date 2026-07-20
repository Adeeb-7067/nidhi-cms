import {
  getNextSequence,
  marketingAccountsTable,
  marketingPostsTable,
  marketingApprovalsTable,
  marketingGraphicsTable,
  marketingContentTable,
  usersTable,
  clientsTable,
} from "../../models/schema/index.js";
import {
  MARKETING_PLATFORMS,
  MARKETING_APPROVAL_STAGES,
  MARKETING_POST_SCHEDULE_STATUSES,
} from "../../constants/marketing.js";
import {
  badRequest,
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
  loadWorkspaceLabelsByAccountIds,
  getScopedDigitalUserAccess,
} from "../../services/marketing/helpers.js";

/** Allowed approval stage transitions (server-side workflow invariant). */
const APPROVAL_TRANSITIONS = {
  internal_review: ["client_review", "revision"],
  client_review: ["approved", "revision"],
  revision: ["internal_review", "client_review"],
  approved: ["scheduled", "revision"],
  scheduled: ["published"],
  published: [],
};

function formatPost(doc, companyName, assigneeName) {
  return {
    id: doc.id,
    accountId: doc.accountId,
    clientId: String(doc.accountId),
    clientName: companyName ?? "Unknown",
    platform: doc.platform,
    caption: doc.caption ?? "",
    hashtags: doc.hashtags ?? [],
    scheduledAt: toIso(doc.scheduledAt),
    approvalStage: doc.approvalStage,
    scheduleStatus: doc.scheduleStatus,
    assigneeId: doc.assigneeId ?? null,
    assignee: assigneeName ?? null,
    mediaIds: doc.mediaIds ?? [],
    createdAt: toIso(doc.createdAt),
  };
}

export async function listPosts(req, res) {
  const pagination = parsePagination(req.query);
  const access = await getScopedDigitalUserAccess(req.user);
  const query = { isDeleted: false };

  if (access.isScoped) {
    query.accountId = { $in: access.accountIds.length ? access.accountIds : [-1] };
  }
  if (req.query.accountId) query.accountId = Number(req.query.accountId);
  if (req.query.scheduleStatus) query.scheduleStatus = String(req.query.scheduleStatus);

  const { items, total, page, limit } = await paginateModel(
    marketingPostsTable,
    query,
    pagination,
    { sort: { scheduledAt: 1 } },
  );

  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  const users = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean(),
  );
  await companies.preload(items.map((p) => p.companyId));
  await users.preload(items.map((p) => p.assigneeId).filter(Boolean));
  const labels = await loadWorkspaceLabelsByAccountIds(items.map((p) => p.accountId));

  res.json({
    posts: items.map((p) => {
      return formatPost(
        p,
        labels.get(p.accountId) ?? companies.get(p.companyId)?.companyName,
        users.get(p.assigneeId)?.name,
      );
    }),
    total,
    page,
    limit,
  });
}

export async function createPost(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  const platform = optionalString(body.platform);
  if (!platform || !MARKETING_PLATFORMS.includes(platform)) {
    badRequest("Valid platform is required.", "platform");
  }

  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");

  const id = await getNextSequence("marketing_posts");
  const doc = await marketingPostsTable.create({
    id,
    accountId,
    companyId: account.companyId,
    platform,
    caption: optionalString(body.caption) ?? "",
    hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String) : [],
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    // New posts always start in review — clients cannot skip the workflow.
    approvalStage: "internal_review",
    scheduleStatus: "pending",
    assigneeId: body.assigneeId != null ? Number(body.assigneeId) : null,
    mediaIds: Array.isArray(body.mediaIds) ? body.mediaIds.map(Number) : [],
    createdBy: req.user.id,
  });

  // Mirror into approvals queue
  const approvalId = await getNextSequence("marketing_approvals");
  await marketingApprovalsTable.create({
    id: approvalId,
    accountId,
    companyId: account.companyId,
    title: `Post · ${platform}`,
    type: "post",
    refType: "post",
    refId: id,
    stage: doc.approvalStage,
    assigneeId: doc.assigneeId,
    createdBy: req.user.id,
  });

  await recordMarketingActivity({
    accountId,
    companyId: account.companyId,
    message: `Calendar post drafted for ${platform}`,
    actorId: req.user.id,
    type: "post",
    entityType: "post",
    entityId: id,
  });

  const company = await clientsTable.findOne({ id: account.companyId }).lean();
  res.status(201).json(formatPost(doc, company?.companyName, null));
}

export async function updatePost(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingPostsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Post");
  assertDocAccount(doc, accountId);

  const body = req.body ?? {};
  if (body.platform != null) {
    if (!MARKETING_PLATFORMS.includes(body.platform)) badRequest("Invalid platform.", "platform");
    doc.platform = body.platform;
  }
  if (body.caption !== undefined) doc.caption = optionalString(body.caption) ?? "";
  if (Array.isArray(body.hashtags)) doc.hashtags = body.hashtags.map(String);
  if (body.scheduledAt !== undefined) {
    doc.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  }
  // approvalStage must change via /approvals/:id/stage (permission + transition rules)
  if (body.approvalStage != null) {
    badRequest(
      "approvalStage cannot be set via calendar update. Use the Approvals advance endpoint.",
      "approvalStage",
    );
  }
  if (body.scheduleStatus != null) {
    if (!MARKETING_POST_SCHEDULE_STATUSES.includes(body.scheduleStatus)) {
      badRequest("Invalid schedule status.", "scheduleStatus");
    }
    // scheduled/published must advance via Approvals — calendar only allows operational statuses
    if (!["pending", "failed"].includes(body.scheduleStatus)) {
      badRequest(
        "scheduleStatus cannot be set to scheduled/published here. Use the Approvals advance endpoint.",
        "scheduleStatus",
      );
    }
    doc.scheduleStatus = body.scheduleStatus;
  }
  if (body.assigneeId !== undefined) {
    doc.assigneeId = body.assigneeId == null ? null : Number(body.assigneeId);
  }
  if (Array.isArray(body.mediaIds)) doc.mediaIds = body.mediaIds.map(Number);

  await doc.save();

  const company = await clientsTable.findOne({ id: doc.companyId }).lean();
  res.json(formatPost(doc, company?.companyName, null));
}

export async function deletePost(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingPostsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Post");
  assertDocAccount(doc, accountId);
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  await marketingApprovalsTable.updateMany(
    { refType: "post", refId: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
  res.json({ ok: true });
}

export async function listApprovals(req, res) {
  const pagination = parsePagination(req.query);
  const access = await getScopedDigitalUserAccess(req.user);
  const query = { isDeleted: false };

  if (access.isScoped) {
    query.accountId = { $in: access.accountIds.length ? access.accountIds : [-1] };
  }
  if (req.query.stage) query.stage = String(req.query.stage);
  if (req.query.accountId) query.accountId = Number(req.query.accountId);

  const { items, total, page, limit } = await paginateModel(
    marketingApprovalsTable,
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
  await companies.preload(items.map((a) => a.companyId));
  await users.preload(items.map((a) => a.assigneeId).filter(Boolean));
  const labels = await loadWorkspaceLabelsByAccountIds(items.map((a) => a.accountId));

  res.json({
    approvals: items.map((a) => {
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        clientName: labels.get(a.accountId) ?? companies.get(a.companyId)?.companyName ?? "Unknown",
        accountId: a.accountId,
        stage: a.stage,
        assigneeId: a.assigneeId ?? null,
        assignee: users.get(a.assigneeId)?.name ?? null,
        updatedAt: toIso(a.updatedAt),
      };
    }),
    total,
    page,
    limit,
  });
}

export async function updateApprovalStage(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingApprovalsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Approval");
  assertDocAccount(doc, accountId);

  const stage = optionalString(req.body?.stage);
  if (!stage || !MARKETING_APPROVAL_STAGES.includes(stage)) {
    badRequest("Valid stage is required.", "stage");
  }

  const allowed = APPROVAL_TRANSITIONS[doc.stage] ?? [];
  if (!allowed.includes(stage)) {
    badRequest(
      `Cannot move approval from "${doc.stage}" to "${stage}". Allowed: ${allowed.join(", ") || "none"}.`,
      "stage",
    );
  }

  doc.stage = stage;
  await doc.save();

  if (doc.refType === "post" && doc.refId) {
    const postUpdate = { approvalStage: stage };
    if (stage === "scheduled") postUpdate.scheduleStatus = "scheduled";
    if (stage === "published") postUpdate.scheduleStatus = "published";
    await marketingPostsTable.updateOne(
      { id: doc.refId, isDeleted: false, accountId },
      { $set: postUpdate },
    );
  } else if (doc.refType === "graphic" && doc.refId) {
    await marketingGraphicsTable.updateOne(
      { id: doc.refId, isDeleted: false, accountId },
      { $set: { status: stage } },
    );
  } else if (doc.refType === "content" && doc.refId) {
    await marketingContentTable.updateOne(
      { id: doc.refId, isDeleted: false, accountId },
      { $set: { status: stage } },
    );
  }

  res.json({ id: doc.id, stage: doc.stage, updatedAt: toIso(doc.updatedAt) });
}

export async function updateApproval(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingApprovalsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Approval");
  assertDocAccount(doc, accountId);

  const body = req.body ?? {};
  if (body.assigneeId !== undefined) {
    doc.assigneeId = body.assigneeId == null || body.assigneeId === "" ? null : Number(body.assigneeId);
    if (doc.assigneeId != null && !Number.isFinite(doc.assigneeId)) {
      badRequest("assigneeId must be a valid user id.", "assigneeId");
    }
  }
  if (body.title != null) {
    const title = optionalString(body.title);
    if (!title) badRequest("title is required.", "title");
    doc.title = title;
  }
  await doc.save();

  const assignee = doc.assigneeId
    ? await usersTable.findOne({ id: doc.assigneeId }, { name: 1 }).lean()
    : null;

  res.json({
    id: doc.id,
    assigneeId: doc.assigneeId ?? null,
    assignee: assignee?.name ?? null,
    title: doc.title,
    stage: doc.stage,
    updatedAt: toIso(doc.updatedAt),
  });
}

export async function deleteApproval(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingApprovalsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Approval");
  assertDocAccount(doc, accountId);
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  if (doc.refType === "post" && doc.refId != null) {
    await marketingPostsTable.updateOne(
      { id: doc.refId, isDeleted: false, accountId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  } else if (doc.refType === "graphic" && doc.refId != null) {
    await marketingGraphicsTable.updateOne(
      { id: doc.refId, isDeleted: false, accountId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  } else if (doc.refType === "content" && doc.refId != null) {
    await marketingContentTable.updateOne(
      { id: doc.refId, isDeleted: false, accountId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }
  res.json({ ok: true });
}
