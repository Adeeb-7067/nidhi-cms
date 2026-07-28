import {
  getNextSequence,
  marketingAccountsTable,
  marketingGraphicsTable,
  marketingVideosTable,
  marketingContentTable,
  marketingApprovalsTable,
  usersTable,
  clientsTable,
} from "../../../models/schema/index.js";
import {
  MARKETING_GRAPHIC_FILE_TYPES,
  MARKETING_CONTENT_TYPES,
  MARKETING_VIDEO_EXPORT_TARGETS,
  MARKETING_VIDEO_RENDER_STATUSES,
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
  resolveScopedAccountId,
  requireScopedAccountId,
  assertDocAccount,
  loadWorkspaceLabelsByAccountIds,
  applyScopedAccountQuery,
  assertScopedAccountAccess,
  canDeleteMarketingOwnedItem,
  canFullyEditMarketingOwnedItem,
  resolveMarketingAssigneeForAccount,
  applyCraftAssigneeVisibility,
} from "../services/helpers.js";
import {
  notifyMarketingQueueAssigned,
} from "../services/post-notifications.js";

async function resolveAccount(accountId) {
  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");
  return account;
}

async function createApprovalMirror({
  account,
  title,
  type,
  refType,
  refId,
  assigneeId,
  createdBy,
  stage = "internal_review",
}) {
  const approvalId = await getNextSequence("marketing_approvals");
  await marketingApprovalsTable.create({
    id: approvalId,
    accountId: account.id,
    companyId: account.companyId,
    title,
    type,
    refType,
    refId,
    stage,
    assigneeId: assigneeId ?? null,
    createdBy,
  });
}

async function softDeleteLinkedApprovals(refType, refId) {
  await marketingApprovalsTable.updateMany(
    { refType, refId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
}

async function enrichWithNames(items) {
  const users = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean(),
  );
  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  await companies.preload(items.map((i) => i.companyId));
  await users.preload(items.map((i) => i.assigneeId).filter(Boolean));
  const labels = await loadWorkspaceLabelsByAccountIds(items.map((i) => i.accountId));
  return { users, companies, labels };
}

// ── Graphics ─────────────────────────────────────────────────────────────

export async function listGraphics(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  await applyCraftAssigneeVisibility(query, req.user);
  if (req.query.status) query.status = String(req.query.status);

  const { items, total, page, limit } = await paginateModel(
    marketingGraphicsTable,
    query,
    pagination,
    { sort: { dueDate: 1, updatedAt: -1 } },
  );
  const { users, companies, labels } = await enrichWithNames(items);

  res.json({
    graphics: items.map((g) => {
      return {
        id: String(g.id),
        title: g.title,
        clientId: String(g.accountId),
        clientName: labels.get(g.accountId) ?? companies.get(g.companyId)?.companyName ?? "Unknown",
        accountId: g.accountId,
        companyId: g.companyId,
        status: g.status,
        revisionCount: g.revisionCount ?? 0,
        brandGuidelineUrl: g.brandGuidelineUrl ?? "#",
        fileTypes: g.fileTypes ?? [],
        assigneeId: g.assigneeId ?? null,
        assignee: users.get(g.assigneeId)?.name ?? "Unassigned",
        dueDate: toIso(g.dueDate)?.slice(0, 10) ?? null,
        createdBy: g.createdBy ?? null,
      };
    }),
    total,
    page,
    limit,
  });
}

export async function createGraphic(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId ?? body.clientId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const title = optionalString(body.title);
  if (!title) badRequest("title is required.", "title");

  const account = await resolveAccount(accountId);
  const status = "internal_review";
  const fileTypes = Array.isArray(body.fileTypes)
    ? body.fileTypes.filter((f) => MARKETING_GRAPHIC_FILE_TYPES.includes(f))
    : [];

  const assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);

  const id = await getNextSequence("marketing_graphics");
  const doc = await marketingGraphicsTable.create({
    id,
    accountId,
    companyId: account.companyId,
    title,
    status,
    revisionCount: Number(body.revisionCount ?? 0),
    brandGuidelineUrl: optionalString(body.brandGuidelineUrl),
    fileTypes,
    assigneeId,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    createdBy: req.user.id,
  });

  await createApprovalMirror({
    account,
    title: `Graphic · ${title}`,
    type: "graphic",
    refType: "graphic",
    refId: id,
    assigneeId: doc.assigneeId,
    createdBy: req.user.id,
    stage: status,
  });

  if (doc.assigneeId != null) {
    void notifyMarketingQueueAssigned({ item: doc, actorId: req.user.id, kind: "graphic" });
  }

  res.status(201).json({ id: String(doc.id), title: doc.title, status: doc.status });
}

export async function updateGraphic(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingGraphicsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Graphic request");
  assertDocAccount(doc, accountId);
  if (!canFullyEditMarketingOwnedItem(req.user, doc)) {
    forbidden("Only the creator or an org admin can edit this graphic request.");
  }
  const body = req.body ?? {};
  const prevAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (body.title != null) doc.title = optionalString(body.title) || doc.title;
  if (body.status != null) {
    badRequest(
      "status cannot be set via this endpoint. Use the Approvals advance endpoint.",
      "status",
    );
  }
  if (body.revisionCount != null) doc.revisionCount = Number(body.revisionCount);
  if (body.brandGuidelineUrl !== undefined)
    doc.brandGuidelineUrl = optionalString(body.brandGuidelineUrl);
  if (Array.isArray(body.fileTypes)) {
    doc.fileTypes = body.fileTypes.filter((f) => MARKETING_GRAPHIC_FILE_TYPES.includes(f));
  }
  if (body.assigneeId !== undefined) {
    const account = await resolveAccount(doc.accountId);
    doc.assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);
  }
  if (body.dueDate !== undefined) doc.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  await doc.save();

  const nextAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (nextAssigneeId != null && nextAssigneeId !== prevAssigneeId) {
    void notifyMarketingQueueAssigned({ item: doc, actorId: req.user.id, kind: "graphic" });
  }

  res.json({ id: String(doc.id), status: doc.status });
}

// ── Videos ───────────────────────────────────────────────────────────────

export async function listVideos(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  await applyCraftAssigneeVisibility(query, req.user);
  if (req.query.renderStatus) query.renderStatus = String(req.query.renderStatus);

  const { items, total, page, limit } = await paginateModel(
    marketingVideosTable,
    query,
    pagination,
    { sort: { dueDate: 1, updatedAt: -1 } },
  );
  const { users, companies, labels } = await enrichWithNames(items);

  res.json({
    videos: items.map((v) => {
      return {
        id: String(v.id),
        title: v.title,
        clientId: String(v.accountId),
        clientName: labels.get(v.accountId) ?? companies.get(v.companyId)?.companyName ?? "Unknown",
        accountId: v.accountId,
        companyId: v.companyId,
        renderStatus: v.renderStatus,
        hasVoiceover: Boolean(v.hasVoiceover),
        hasSubtitles: Boolean(v.hasSubtitles),
        hasThumbnail: Boolean(v.hasThumbnail),
        exportTarget: v.exportTarget,
        assigneeId: v.assigneeId ?? null,
        assignee: users.get(v.assigneeId)?.name ?? "Unassigned",
        dueDate: toIso(v.dueDate)?.slice(0, 10) ?? null,
        createdBy: v.createdBy ?? null,
      };
    }),
    total,
    page,
    limit,
  });
}

export async function createVideo(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId ?? body.clientId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const title = optionalString(body.title);
  if (!title) badRequest("title is required.", "title");

  const account = await resolveAccount(accountId);
  const renderStatus = MARKETING_VIDEO_RENDER_STATUSES.includes(body.renderStatus)
    ? body.renderStatus
    : "raw_uploaded";
  const exportTarget = MARKETING_VIDEO_EXPORT_TARGETS.includes(body.exportTarget)
    ? body.exportTarget
    : "reel";

  const assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);

  const id = await getNextSequence("marketing_videos");
  const doc = await marketingVideosTable.create({
    id,
    accountId,
    companyId: account.companyId,
    title,
    renderStatus,
    hasVoiceover: Boolean(body.hasVoiceover),
    hasSubtitles: Boolean(body.hasSubtitles),
    hasThumbnail: Boolean(body.hasThumbnail),
    exportTarget,
    assigneeId,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    createdBy: req.user.id,
  });

  if (doc.assigneeId != null) {
    void notifyMarketingQueueAssigned({ item: doc, actorId: req.user.id, kind: "video" });
  }

  res.status(201).json({ id: String(doc.id), title: doc.title, renderStatus: doc.renderStatus });
}

export async function updateVideo(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingVideosTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Video request");
  assertDocAccount(doc, accountId);
  if (!canFullyEditMarketingOwnedItem(req.user, doc)) {
    forbidden("Only the creator or an org admin can edit this video request.");
  }
  const body = req.body ?? {};
  const prevAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (body.title != null) doc.title = optionalString(body.title) || doc.title;
  if (MARKETING_VIDEO_RENDER_STATUSES.includes(body.renderStatus))
    doc.renderStatus = body.renderStatus;
  if (MARKETING_VIDEO_EXPORT_TARGETS.includes(body.exportTarget))
    doc.exportTarget = body.exportTarget;
  if (body.hasVoiceover !== undefined) doc.hasVoiceover = Boolean(body.hasVoiceover);
  if (body.hasSubtitles !== undefined) doc.hasSubtitles = Boolean(body.hasSubtitles);
  if (body.hasThumbnail !== undefined) doc.hasThumbnail = Boolean(body.hasThumbnail);
  if (body.assigneeId !== undefined) {
    const account = await resolveAccount(doc.accountId);
    doc.assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);
  }
  if (body.dueDate !== undefined) doc.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  await doc.save();

  const nextAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (nextAssigneeId != null && nextAssigneeId !== prevAssigneeId) {
    void notifyMarketingQueueAssigned({ item: doc, actorId: req.user.id, kind: "video" });
  }

  res.json({ id: String(doc.id), renderStatus: doc.renderStatus });
}

// ── Content ──────────────────────────────────────────────────────────────

export async function listContent(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  await applyCraftAssigneeVisibility(query, req.user);
  if (req.query.type) query.type = String(req.query.type);
  if (req.query.status) query.status = String(req.query.status);

  const { items, total, page, limit } = await paginateModel(
    marketingContentTable,
    query,
    pagination,
    { sort: { dueDate: 1, updatedAt: -1 } },
  );
  const { users, companies, labels } = await enrichWithNames(items);

  res.json({
    content: items.map((c) => {
      return {
        id: String(c.id),
        title: c.title,
        type: c.type,
        clientName: labels.get(c.accountId) ?? companies.get(c.companyId)?.companyName ?? "Unknown",
        accountId: c.accountId,
        companyId: c.companyId,
        status: c.status,
        seoScore: c.seoScore ?? 0,
        wordCount: c.wordCount ?? 0,
        assigneeId: c.assigneeId ?? null,
        assignee: users.get(c.assigneeId)?.name ?? "Unassigned",
        dueDate: toIso(c.dueDate)?.slice(0, 10) ?? null,
        createdBy: c.createdBy ?? null,
      };
    }),
    total,
    page,
    limit,
  });
}

export async function createContent(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId ?? body.clientId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const title = optionalString(body.title);
  if (!title) badRequest("title is required.", "title");

  const account = await resolveAccount(accountId);
  const type = MARKETING_CONTENT_TYPES.includes(body.type) ? body.type : "blog";
  const status = "internal_review";
  const assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);

  const id = await getNextSequence("marketing_content");
  const doc = await marketingContentTable.create({
    id,
    accountId,
    companyId: account.companyId,
    title,
    type,
    status,
    seoScore: Number(body.seoScore ?? 0),
    wordCount: Number(body.wordCount ?? 0),
    assigneeId,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    createdBy: req.user.id,
  });

  await createApprovalMirror({
    account,
    title: `Content · ${title}`,
    type: "content",
    refType: "content",
    refId: id,
    assigneeId: doc.assigneeId,
    createdBy: req.user.id,
    stage: status,
  });

  if (doc.assigneeId != null) {
    void notifyMarketingQueueAssigned({ item: doc, actorId: req.user.id, kind: "content" });
  }

  res.status(201).json({ id: String(doc.id), title: doc.title, type: doc.type });
}

export async function updateContent(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingContentTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Content item");
  assertDocAccount(doc, accountId);
  if (!canFullyEditMarketingOwnedItem(req.user, doc)) {
    forbidden("Only the creator or an org admin can edit this content item.");
  }
  const body = req.body ?? {};
  const prevAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (body.title != null) doc.title = optionalString(body.title) || doc.title;
  if (MARKETING_CONTENT_TYPES.includes(body.type)) doc.type = body.type;
  if (body.status != null) {
    badRequest(
      "status cannot be set via this endpoint. Use the Approvals advance endpoint.",
      "status",
    );
  }
  if (body.seoScore != null) doc.seoScore = Number(body.seoScore);
  if (body.wordCount != null) doc.wordCount = Number(body.wordCount);
  if (body.assigneeId !== undefined) {
    const account = await resolveAccount(doc.accountId);
    doc.assigneeId = await resolveMarketingAssigneeForAccount(req.user, account, body.assigneeId);
  }
  if (body.dueDate !== undefined) doc.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  await doc.save();

  const nextAssigneeId = doc.assigneeId != null ? Number(doc.assigneeId) : null;
  if (nextAssigneeId != null && nextAssigneeId !== prevAssigneeId) {
    void notifyMarketingQueueAssigned({ item: doc, actorId: req.user.id, kind: "content" });
  }

  res.json({ id: String(doc.id), status: doc.status });
}

async function softDeleteQueueItem(model, id, label, accountId, reqUser, refType = null) {
  const doc = await model.findOne({ id, isDeleted: false });
  if (!doc) notFound(label);
  assertDocAccount(doc, accountId);

  if (!(await canDeleteMarketingOwnedItem(reqUser, doc))) {
    forbidden(`Only the creator or an org admin can delete ${label.toLowerCase()}s.`);
  }

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  if (refType) await softDeleteLinkedApprovals(refType, id);
  return { ok: true };
}

export async function deleteGraphic(req, res) {
  const accountId = await requireScopedAccountId(req);
  res.json(
    await softDeleteQueueItem(
      marketingGraphicsTable,
      parseIdParam(req.params.id),
      "Graphic request",
      accountId,
      req.user,
      "graphic",
    ),
  );
}

export async function deleteVideo(req, res) {
  const accountId = await requireScopedAccountId(req);
  res.json(
    await softDeleteQueueItem(
      marketingVideosTable,
      parseIdParam(req.params.id),
      "Video request",
      accountId,
      req.user,
    ),
  );
}

export async function deleteContent(req, res) {
  const accountId = await requireScopedAccountId(req);
  res.json(
    await softDeleteQueueItem(
      marketingContentTable,
      parseIdParam(req.params.id),
      "Content item",
      accountId,
      req.user,
      "content",
    ),
  );
}

