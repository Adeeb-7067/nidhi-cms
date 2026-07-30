import {
  getNextSequence,
  marketingAccountsTable,
  marketingPostsTable,
  marketingApprovalsTable,
  marketingGraphicsTable,
  marketingContentTable,
  usersTable,
  clientsTable,
} from "../../../models/schema/index.js";
import {
  MARKETING_PLATFORMS,
  MARKETING_APPROVAL_STAGES,
  MARKETING_POST_SCHEDULE_STATUSES,
  MARKETING_POST_CONTENT_FORMATS,
} from "../../../constants/marketing.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";

import { paginateModel, toIso } from "../../../utils/mongo-list.js";
import { IdLookupCache } from "../../../lib/lookup-cache.js";
import {
  recordMarketingActivity,
  resolveScopedAccountId,
  requireScopedAccountId,
  assertDocAccount,
  loadWorkspaceLabelsByAccountIds,
  applyScopedAccountQuery,
  assertScopedAccountAccess,
  canDeleteMarketingOwnedItem,
  canFullyEditMarketingOwnedItem,
  canAdvanceMarketingApprovalStage,
  applyCraftAssigneeVisibility,
  resolveMarketingAssigneeForAccount,
} from "../services/helpers.js";
import {
  notifyMarketingPostAssigned,
  notifyMarketingApprovalAssigned,
  notifyMarketingApprovalStageChanged,
} from "../services/post-notifications.js";

/** Allowed approval stage transitions (server-side workflow invariant). */
const APPROVAL_TRANSITIONS = {
  internal_review: ["client_review", "revision"],
  client_review: ["approved", "revision"],
  revision: ["internal_review", "client_review"],
  approved: ["scheduled", "revision"],
  scheduled: ["published"],
  published: [],
};

function normalizePostPlatforms(body) {
  const fromArray = Array.isArray(body.platforms)
    ? body.platforms.map(String).filter((p) => MARKETING_PLATFORMS.includes(p))
    : [];
  const single = optionalString(body.platform);
  const list = [...new Set(fromArray.length ? fromArray : single && MARKETING_PLATFORMS.includes(single) ? [single] : [])];
  if (!list.length) {
    badRequest("Select at least one platform.", "platforms");
  }
  return list;
}

function formatPost(doc, companyName, assigneeName) {
  const platforms =
    Array.isArray(doc.platforms) && doc.platforms.length > 0
      ? doc.platforms
      : doc.platform
        ? [doc.platform]
        : [];
  return {
    id: doc.id,
    accountId: doc.accountId,
    clientId: String(doc.accountId),
    clientName: companyName ?? "Unknown",
    platform: doc.platform ?? platforms[0],
    platforms,
    contentFormat: doc.contentFormat ?? "post",
    caption: doc.caption ?? "",
    hashtags: doc.hashtags ?? [],
    scheduledAt: toIso(doc.scheduledAt),
    approvalStage: doc.approvalStage,
    scheduleStatus: doc.scheduleStatus,
    assigneeId: doc.assigneeId ?? null,
    assignee: assigneeName ?? null,
    mediaIds: doc.mediaIds ?? [],
    createdBy: doc.createdBy ?? null,
    createdAt: toIso(doc.createdAt),
  };
}

function parseOptionalIsoDate(raw, field) {
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) badRequest(`Invalid ${field}. Use an ISO date.`, field);
  return d;
}

/** Merge a clause without clobbering craft-visibility `$or`. */
function andQueryClause(query, clause) {
  if (!clause || Object.keys(clause).length === 0) return;
  if (query.$or) {
    const craftOr = query.$or;
    delete query.$or;
    query.$and = [...(query.$and ?? []), { $or: craftOr }, clause];
    return;
  }
  if (query.$and) {
    query.$and.push(clause);
    return;
  }
  Object.assign(query, clause);
}

/**
 * Calendar / list window: scheduledFrom + scheduledTo (inclusive ISO).
 * includeUnscheduled=1 also returns drafts with null scheduledAt.
 */
function applyScheduledAtWindow(query, q) {
  const from = parseOptionalIsoDate(q.scheduledFrom, "scheduledFrom");
  const to = parseOptionalIsoDate(q.scheduledTo, "scheduledTo");
  const includeUnscheduled =
    q.includeUnscheduled === "1" ||
    q.includeUnscheduled === "true" ||
    q.includeUnscheduled === true;

  if (!from && !to && !includeUnscheduled) return;

  if (from && to && from.getTime() > to.getTime()) {
    badRequest("scheduledFrom must be before scheduledTo.", "scheduledFrom");
  }

  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;

  if (Object.keys(range).length > 0 && includeUnscheduled) {
    andQueryClause(query, {
      $or: [{ scheduledAt: range }, { scheduledAt: null }],
    });
  } else if (Object.keys(range).length > 0) {
    andQueryClause(query, { scheduledAt: range });
  } else if (includeUnscheduled) {
    andQueryClause(query, { scheduledAt: null });
  }
}

export async function listPosts(req, res) {
  const hasWindow = Boolean(req.query.scheduledFrom || req.query.scheduledTo);
  // Date-bounded calendar fetches need the full window, not a stale 20/200 page.
  const pagination = parsePagination({
    ...req.query,
    limit: req.query.limit ?? (hasWindow ? "1000" : "200"),
  });
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  await applyCraftAssigneeVisibility(query, req.user);
  if (req.query.scheduleStatus) query.scheduleStatus = String(req.query.scheduleStatus);
  applyScheduledAtWindow(query, req.query);

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
  await assertScopedAccountAccess(req.user, accountId);
  const platforms = normalizePostPlatforms(body);
  const platform = platforms[0];

  let contentFormat = optionalString(body.contentFormat) ?? "post";
  if (!MARKETING_POST_CONTENT_FORMATS.includes(contentFormat)) {
    badRequest(
      `contentFormat must be one of: ${MARKETING_POST_CONTENT_FORMATS.join(", ")}.`,
      "contentFormat",
    );
  }

  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");

  const assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);

  const id = await getNextSequence("marketing_posts");
  const platformLabel = platforms.map((p) => p).join(", ");
  const doc = await marketingPostsTable.create({
    id,
    accountId,
    companyId: account.companyId,
    platform,
    platforms,
    contentFormat,
    caption: optionalString(body.caption) ?? "",
    hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String) : [],
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    // New posts always start in review — clients cannot skip the workflow.
    approvalStage: "internal_review",
    scheduleStatus: "pending",
    assigneeId,
    mediaIds: Array.isArray(body.mediaIds) ? body.mediaIds.map(Number) : [],
    createdBy: req.user.id,
  });

  // Mirror into approvals queue
  const approvalId = await getNextSequence("marketing_approvals");
  await marketingApprovalsTable.create({
    id: approvalId,
    accountId,
    companyId: account.companyId,
    title: `Post · ${platformLabel}`,
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
    message: `Calendar post drafted for ${platformLabel}`,
    actorId: req.user.id,
    type: "post",
    entityType: "post",
    entityId: id,
  });

  if (doc.assigneeId != null) {
    void notifyMarketingPostAssigned({ post: doc, actorId: req.user.id });
  }

  const company = await clientsTable.findOne({ id: account.companyId }).lean();
  res.status(201).json(formatPost(doc, company?.companyName, null));
}

export async function updatePost(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingPostsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Post");
  assertDocAccount(doc, accountId);

  if (!canFullyEditMarketingOwnedItem(req.user, doc)) {
    forbidden("Only the creator or an org admin can edit this calendar post.");
  }

  const prevAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  const prevScheduledAt = doc.scheduledAt ? new Date(doc.scheduledAt).getTime() : null;

  const body = req.body ?? {};
  if (body.platforms != null || body.platform != null) {
    const platforms = normalizePostPlatforms(body);
    doc.platforms = platforms;
    doc.platform = platforms[0];
  }
  if (body.contentFormat !== undefined) {
    if (!MARKETING_POST_CONTENT_FORMATS.includes(body.contentFormat)) {
      badRequest(
        `contentFormat must be one of: ${MARKETING_POST_CONTENT_FORMATS.join(", ")}.`,
        "contentFormat",
      );
    }
    doc.contentFormat = body.contentFormat;
  }
  if (body.caption !== undefined) doc.caption = optionalString(body.caption) ?? "";
  if (Array.isArray(body.hashtags)) doc.hashtags = body.hashtags.map(String);
  if (body.scheduledAt !== undefined) {
    doc.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const nextScheduledAt = doc.scheduledAt ? doc.scheduledAt.getTime() : null;
    if (nextScheduledAt !== prevScheduledAt) {
      doc.reminderSentAt = null;
    }
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
    const account = await marketingAccountsTable
      .findOne({ id: doc.accountId, isDeleted: false })
      .lean();
    if (!account) notFound("Digital account");
    doc.assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);
  }
  if (Array.isArray(body.mediaIds)) doc.mediaIds = body.mediaIds.map(Number);

  await doc.save();

  const nextAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (nextAssigneeId != null && nextAssigneeId !== prevAssigneeId) {
    void notifyMarketingPostAssigned({ post: doc, actorId: req.user.id });
  }

  const company = await clientsTable.findOne({ id: doc.companyId }).lean();
  res.json(formatPost(doc, company?.companyName, null));
}

export async function deletePost(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingPostsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Post");
  assertDocAccount(doc, accountId);

  if (!(await canDeleteMarketingOwnedItem(req.user, doc))) {
    forbidden(
      "Only the post creator, an Account Manager / digital lead, or an org admin can delete calendar posts.",
    );
  }

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
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  await applyCraftAssigneeVisibility(query, req.user);
  if (req.query.stage) query.stage = String(req.query.stage);

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
        createdBy: a.createdBy ?? null,
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
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingApprovalsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Approval");
  assertDocAccount(doc, accountId);

  const stage = optionalString(req.body?.stage);
  if (!stage || !MARKETING_APPROVAL_STAGES.includes(stage)) {
    badRequest("Valid stage is required.", "stage");
  }

  if (!(await canAdvanceMarketingApprovalStage(req.user, doc))) {
    forbidden(
      "Only the creator, assignee, account lead, or an org admin can advance this approval.",
    );
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

  const stageLabel = String(stage).replace(/_/g, " ");
  void notifyMarketingApprovalStageChanged({
    approval: doc,
    actorId: req.user.id,
    stageLabel,
  });

  res.json({ id: doc.id, stage: doc.stage, updatedAt: toIso(doc.updatedAt) });
}

export async function updateApproval(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingApprovalsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Approval");
  assertDocAccount(doc, accountId);

  if (!canFullyEditMarketingOwnedItem(req.user, doc)) {
    forbidden("Only the creator or an org admin can edit this approval.");
  }

  const body = req.body ?? {};
  const prevAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (body.assigneeId !== undefined) {
    const account = await marketingAccountsTable
      .findOne({ id: doc.accountId, isDeleted: false })
      .lean();
    if (!account) notFound("Digital account");
    doc.assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);
  }
  if (body.title != null) {
    const title = optionalString(body.title);
    if (!title) badRequest("title is required.", "title");
    doc.title = title;
  }
  await doc.save();

  const nextAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (nextAssigneeId != null && nextAssigneeId !== prevAssigneeId) {
    void notifyMarketingApprovalAssigned({ approval: doc, actorId: req.user.id });
  }

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
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingApprovalsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Approval");
  assertDocAccount(doc, accountId);
  if (!(await canDeleteMarketingOwnedItem(req.user, doc))) {
    forbidden("Only the creator or an org admin can delete this approval.");
  }
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
