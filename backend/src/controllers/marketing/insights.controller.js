import {
  getNextSequence,
  marketingAccountsTable,
  marketingCampaignsTable,
  marketingSocialMetricsTable,
  marketingSeoKeywordsTable,
  marketingSeoAuditsTable,
  marketingReportsTable,
  marketingTasksTable,
  usersTable,
  clientsTable,
} from "../../models/schema/index.js";
import {
  MARKETING_CAMPAIGN_STATUSES,
  MARKETING_META_OBJECTIVES,
  MARKETING_GOOGLE_TYPES,
  MARKETING_PLATFORMS,
  MARKETING_RANKING_TRENDS,
  MARKETING_REPORT_PERIODS,
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
  resolveScopedAccountId,
  assertDocAccount,
  loadWorkspaceLabelsByAccountIds,
  applyScopedAccountQuery,
  assertScopedAccountAccess,
} from "../../services/marketing/helpers.js";

async function resolveAccount(accountId) {
  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");
  return account;
}

// ── Campaigns (Meta / Google) ────────────────────────────────────────────

function formatCampaign(doc, companyName) {
  const base = {
    id: String(doc.id),
    name: doc.name,
    clientName: companyName ?? "Unknown",
    accountId: doc.accountId,
    companyId: doc.companyId,
    network: doc.network,
    status: doc.status,
    budgetInr: doc.budgetInr ?? 0,
    roas: doc.roas ?? 0,
  };
  if (doc.network === "meta") {
    return {
      ...base,
      objective: doc.objective ?? "awareness",
      audience: doc.audience ?? "",
      reach: doc.reach ?? 0,
      impressions: doc.impressions ?? 0,
      ctr: doc.ctr ?? 0,
      cpc: doc.cpc ?? 0,
      cpm: doc.cpm ?? 0,
      leads: doc.leads ?? 0,
    };
  }
  return {
    ...base,
    type: doc.googleType ?? "search",
    keywords: doc.keywords ?? [],
    qualityScore: doc.qualityScore ?? 0,
    cpa: doc.cpa ?? 0,
    conversions: doc.conversions ?? 0,
  };
}

export async function listCampaigns(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  if (req.query.network) query.network = String(req.query.network);
  if (req.query.status) query.status = String(req.query.status);

  const { items, total, page, limit } = await paginateModel(
    marketingCampaignsTable,
    query,
    pagination,
    { sort: { updatedAt: -1 } },
  );

  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  await companies.preload(items.map((i) => i.companyId));
  const labels = await loadWorkspaceLabelsByAccountIds(items.map((i) => i.accountId));

  res.json({
    campaigns: items.map((c) =>
      formatCampaign(
        c,
        labels.get(c.accountId) ?? companies.get(c.companyId)?.companyName,
      ),
    ),
    total,
    page,
    limit,
  });
}

export async function createCampaign(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId ?? body.clientId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const name = optionalString(body.name);
  if (!name) badRequest("name is required.", "name");
  const network = body.network === "google" ? "google" : body.network === "meta" ? "meta" : null;
  if (!network) badRequest("network must be meta or google.", "network");

  const account = await resolveAccount(accountId);
  const status = MARKETING_CAMPAIGN_STATUSES.includes(body.status) ? body.status : "draft";

  const payload = {
    id: await getNextSequence("marketing_campaigns"),
    accountId,
    companyId: account.companyId,
    network,
    name,
    status,
    budgetInr: Number(body.budgetInr ?? 0),
    roas: Number(body.roas ?? 0),
    createdBy: req.user.id,
  };

  if (network === "meta") {
    payload.objective = MARKETING_META_OBJECTIVES.includes(body.objective)
      ? body.objective
      : "awareness";
    payload.audience = optionalString(body.audience) ?? "";
    payload.reach = Number(body.reach ?? 0);
    payload.impressions = Number(body.impressions ?? 0);
    payload.ctr = Number(body.ctr ?? 0);
    payload.cpc = Number(body.cpc ?? 0);
    payload.cpm = Number(body.cpm ?? 0);
    payload.leads = Number(body.leads ?? 0);
  } else {
    payload.googleType = MARKETING_GOOGLE_TYPES.includes(body.type ?? body.googleType)
      ? (body.type ?? body.googleType)
      : "search";
    payload.keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : [];
    payload.qualityScore = Number(body.qualityScore ?? 0);
    payload.cpa = Number(body.cpa ?? 0);
    payload.conversions = Number(body.conversions ?? 0);
  }

  const doc = await marketingCampaignsTable.create(payload);
  res.status(201).json(formatCampaign(doc.toObject(), null));
}

export async function updateCampaign(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingCampaignsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Campaign");
  assertDocAccount(doc, accountId);
  const body = req.body ?? {};
  if (body.name != null) {
    const name = optionalString(body.name);
    if (!name) badRequest("name is required.", "name");
    doc.name = name;
  }
  if (MARKETING_CAMPAIGN_STATUSES.includes(body.status)) doc.status = body.status;
  if (body.budgetInr != null) doc.budgetInr = Number(body.budgetInr);
  if (body.roas != null) doc.roas = Number(body.roas);
  if (doc.network === "meta") {
    if (MARKETING_META_OBJECTIVES.includes(body.objective)) doc.objective = body.objective;
    if (body.audience !== undefined) doc.audience = optionalString(body.audience) ?? "";
    if (body.reach != null) doc.reach = Number(body.reach);
    if (body.impressions != null) doc.impressions = Number(body.impressions);
    if (body.ctr != null) doc.ctr = Number(body.ctr);
    if (body.cpc != null) doc.cpc = Number(body.cpc);
    if (body.cpm != null) doc.cpm = Number(body.cpm);
    if (body.leads != null) doc.leads = Number(body.leads);
  } else {
    const gType = body.type ?? body.googleType;
    if (MARKETING_GOOGLE_TYPES.includes(gType)) doc.googleType = gType;
    if (Array.isArray(body.keywords)) doc.keywords = body.keywords.map(String);
    if (body.qualityScore != null) doc.qualityScore = Number(body.qualityScore);
    if (body.cpa != null) doc.cpa = Number(body.cpa);
    if (body.conversions != null) doc.conversions = Number(body.conversions);
  }
  await doc.save();
  const company = await clientsTable.findOne({ id: doc.companyId }).lean();
  res.json(formatCampaign(doc.toObject(), company?.companyName));
}

export async function deleteCampaign(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingCampaignsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Campaign");
  assertDocAccount(doc, accountId);

  const isSuperAdminOrHr = req.user.role === "super_admin" || req.user.role === "hr" || req.user.role === "manager";
  const isCreator = doc.createdBy != null && Number(doc.createdBy) === Number(req.user.id);
  const subRoleLower = (req.user.subType ?? "").toLowerCase();
  const isAccountManager = subRoleLower.includes("account_manager");

  if (!isSuperAdminOrHr && !isCreator && !isAccountManager) {
    forbidden("Only campaign creators, account managers, or admins can delete ad campaigns.");
  }

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  res.json({ ok: true });
}


// ── Social ───────────────────────────────────────────────────────────────

export async function listSocialMetrics(req, res) {
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);

  const items = await marketingSocialMetricsTable
    .find(query)
    .sort({ platform: 1 })
    .lean();

  const labels = await loadWorkspaceLabelsByAccountIds(items.map((m) => m.accountId));

  res.json({
    metrics: items.map((m) => ({
      id: m.id,
      accountId: m.accountId,
      clientName: labels.get(m.accountId) ?? "Unknown",
      platform: m.platform,
      followers: m.followers ?? 0,
      reach: m.reach ?? 0,
      engagement: m.engagement ?? 0,
      engagementRate: m.engagementRate ?? 0,
      bestPostTitle: m.bestPostTitle ?? "",
      worstPostTitle: m.worstPostTitle ?? "",
    })),
  });
}

export async function upsertSocialMetric(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const platform = optionalString(body.platform);
  if (!platform || !MARKETING_PLATFORMS.includes(platform)) {
    badRequest("Valid platform is required.", "platform");
  }

  const account = await resolveAccount(accountId);
  const existing = await marketingSocialMetricsTable.findOne({
    accountId,
    platform,
    isDeleted: false,
  });

  const fields = {
    followers: Number(body.followers ?? 0),
    reach: Number(body.reach ?? 0),
    engagement: Number(body.engagement ?? 0),
    engagementRate: Number(body.engagementRate ?? 0),
    bestPostTitle: optionalString(body.bestPostTitle) ?? "",
    worstPostTitle: optionalString(body.worstPostTitle) ?? "",
  };

  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    return res.json({ id: existing.id, platform: existing.platform });
  }

  // Revive soft-deleted row if a legacy unique index blocks re-create
  const softDeleted = await marketingSocialMetricsTable.findOne({
    accountId,
    platform,
    isDeleted: true,
  });
  if (softDeleted) {
    softDeleted.isDeleted = false;
    Object.assign(softDeleted, fields);
    await softDeleted.save();
    return res.json({ id: softDeleted.id, platform: softDeleted.platform });
  }

  try {
    const id = await getNextSequence("marketing_social_metrics");
    const doc = await marketingSocialMetricsTable.create({
      id,
      accountId,
      companyId: account.companyId,
      platform,
      ...fields,
      createdBy: req.user.id,
    });
    res.status(201).json({ id: doc.id, platform: doc.platform });
  } catch (err) {
    if (err?.code === 11000) {
      badRequest("A metric for this platform already exists on the account.", "platform");
    }
    throw err;
  }
}

// ── SEO ──────────────────────────────────────────────────────────────────

export async function getSeoPanel(req, res) {
  const accountFilter = { isDeleted: false };
  await applyScopedAccountQuery(accountFilter, req.user, req.query.accountId);

  const [keywords, audits] = await Promise.all([
    marketingSeoKeywordsTable.find(accountFilter).sort({ currentRank: 1 }).limit(100).lean(),
    marketingSeoAuditsTable.find(accountFilter).sort({ lastAuditDate: -1 }).limit(20).lean(),
  ]);

  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  await companies.preload([
    ...keywords.map((k) => k.companyId),
    ...audits.map((a) => a.companyId),
  ]);
  const labels = await loadWorkspaceLabelsByAccountIds([
    ...keywords.map((k) => k.accountId),
    ...audits.map((a) => a.accountId),
  ]);

  const avgRank =
    keywords.length > 0
      ? Math.round(
          keywords.reduce((s, k) => s + (k.currentRank || 0), 0) / keywords.length,
        )
      : 0;
  const top10 = keywords.filter((k) => (k.currentRank || 99) <= 10).length;

  // Lightweight derived charts — enough for the SEO page without separate collections
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const monthlyRankingTrend = months.map((month, i) => ({
    month,
    avgRank: Math.max(1, avgRank + (3 - i)),
    keywordsTop10: Math.max(0, top10 - 2 + i),
  }));

  const backlinksSummary = {
    total: Math.max(120, keywords.length * 85),
    newThisMonth: Math.max(4, Math.round(keywords.length * 1.5)),
    lost: Math.max(1, Math.round(keywords.length * 0.4)),
    domainAuthority: Math.min(72, 35 + Math.round(avgRank ? 40 / Math.max(avgRank, 1) : 20)),
  };

  const coreWebVitals = [
    { metric: "LCP", value: "2.1s", status: "good" },
    { metric: "INP", value: "180ms", status: "good" },
    { metric: "CLS", value: "0.08", status: "needs_improvement" },
  ];

  res.json({
    keywords: keywords.map((k) => ({
      id: String(k.id),
      keyword: k.keyword,
      clientName: labels.get(k.accountId) ?? companies.get(k.companyId)?.companyName ?? "Unknown",
      accountId: k.accountId,
      currentRank: k.currentRank ?? 0,
      previousRank: k.previousRank ?? 0,
      trend: k.trend ?? "stable",
      searchVolume: k.searchVolume ?? 0,
      url: k.url ?? "",
    })),
    audits: audits.map((a) => ({
      id: String(a.id),
      clientName: labels.get(a.accountId) ?? companies.get(a.companyId)?.companyName ?? "Unknown",
      accountId: a.accountId,
      score: a.score ?? 0,
      issues: a.issues ?? 0,
      lastAuditDate: toIso(a.lastAuditDate)?.slice(0, 10) ?? null,
    })),
    backlinksSummary,
    monthlyRankingTrend,
    coreWebVitals,
    /** Flags UI that these chart blocks are illustrative until integrations exist */
    derivedMetrics: true,
    derivedMetricsNote:
      "Backlinks, ranking trend chart, and Core Web Vitals are illustrative estimates derived from keyword data — not live crawl/Search Console feeds.",
  });
}

export async function createSeoKeyword(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const keyword = optionalString(body.keyword);
  if (!keyword) badRequest("keyword is required.", "keyword");

  const account = await resolveAccount(accountId);
  const trend = MARKETING_RANKING_TRENDS.includes(body.trend) ? body.trend : "stable";
  const id = await getNextSequence("marketing_seo_keywords");
  const doc = await marketingSeoKeywordsTable.create({
    id,
    accountId,
    companyId: account.companyId,
    keyword,
    currentRank: Number(body.currentRank ?? 0),
    previousRank: Number(body.previousRank ?? body.currentRank ?? 0),
    trend,
    searchVolume: Number(body.searchVolume ?? 0),
    url: optionalString(body.url) ?? "",
    createdBy: req.user.id,
  });
  res.status(201).json({ id: String(doc.id), keyword: doc.keyword });
}

export async function updateSeoKeyword(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingSeoKeywordsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("SEO keyword");
  assertDocAccount(doc, accountId);
  const body = req.body ?? {};
  if (body.keyword != null) {
    const keyword = optionalString(body.keyword);
    if (!keyword) badRequest("keyword is required.", "keyword");
    doc.keyword = keyword;
  }
  if (body.currentRank != null) doc.currentRank = Number(body.currentRank);
  if (body.previousRank != null) doc.previousRank = Number(body.previousRank);
  if (MARKETING_RANKING_TRENDS.includes(body.trend)) doc.trend = body.trend;
  if (body.searchVolume != null) doc.searchVolume = Number(body.searchVolume);
  if (body.url !== undefined) doc.url = optionalString(body.url) ?? "";
  await doc.save();
  res.json({ id: String(doc.id), keyword: doc.keyword });
}

export async function deleteSeoKeyword(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingSeoKeywordsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("SEO keyword");
  assertDocAccount(doc, accountId);
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  res.json({ ok: true });
}

export async function deleteSocialMetric(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingSocialMetricsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Social metric");
  assertDocAccount(doc, accountId);
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  res.json({ ok: true });
}

// ── Team performance (derived from tasks) ────────────────────────────────

export async function getTeamPerformance(req, res) {
  const match = { isDeleted: false, assigneeId: { $ne: null } };
  await applyScopedAccountQuery(match, req.user, req.query.accountId);

  const tasks = await marketingTasksTable.find(match).lean();
  const byAssignee = new Map();
  for (const t of tasks) {
    const key = t.assigneeId;
    if (!byAssignee.has(key)) {
      byAssignee.set(key, { completed: 0, late: 0, total: 0, deliveryDays: [] });
    }
    const row = byAssignee.get(key);
    row.total += 1;
    if (t.status === "completed") {
      row.completed += 1;
      if (t.deadline && t.updatedAt) {
        const days = Math.max(
          0,
          Math.round((new Date(t.updatedAt) - new Date(t.createdAt)) / 86400000),
        );
        row.deliveryDays.push(days);
        if (new Date(t.updatedAt) > new Date(t.deadline)) row.late += 1;
      }
    } else if (t.deadline && new Date(t.deadline) < new Date() && t.status !== "cancelled") {
      row.late += 1;
    }
  }

  const users = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1, role: 1 }).lean(),
  );
  await users.preload([...byAssignee.keys()]);

  const members = [...byAssignee.entries()].map(([assigneeId, stats]) => {
    const user = users.get(assigneeId);
    const avgDeliveryDays =
      stats.deliveryDays.length > 0
        ? Math.round(
            (stats.deliveryDays.reduce((a, b) => a + b, 0) / stats.deliveryDays.length) * 10,
          ) / 10
        : 0;
    const productivityPct =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const lateDeliveryPct =
      stats.total > 0 ? Math.round((stats.late / stats.total) * 1000) / 10 : 0;
    return {
      id: String(assigneeId),
      name: user?.name ?? `User #${assigneeId}`,
      role: user?.role ?? "team",
      tasksCompleted: stats.completed,
      avgDeliveryDays,
      /** Estimated from completion rate until client ratings are stored */
      clientRating: Math.min(5, Math.max(3.5, 4.2 + (productivityPct - 70) / 50)),
      clientRatingIsEstimated: true,
      productivityPct,
      lateDeliveryPct,
    };
  });

  members.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  res.json({ members });
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function listReports(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  await applyScopedAccountQuery(query, req.user, req.query.accountId);
  if (req.query.period && MARKETING_REPORT_PERIODS.includes(req.query.period)) {
    query.period = req.query.period;
  }

  const { items, total, page, limit } = await paginateModel(
    marketingReportsTable,
    query,
    pagination,
    { sort: { generatedAt: -1 } },
  );

  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean(),
  );
  await companies.preload(items.map((i) => i.companyId).filter(Boolean));
  const labels = await loadWorkspaceLabelsByAccountIds(
    items.map((i) => i.accountId).filter(Boolean),
  );

  res.json({
    reports: items.map((r) => ({
      id: String(r.id),
      title: r.title,
      period: r.period,
      generatedAt: toIso(r.generatedAt) ?? toIso(r.createdAt),
      clientName: r.accountId
        ? labels.get(r.accountId)
        : r.companyId
          ? companies.get(r.companyId)?.companyName
          : undefined,
      accountId: r.accountId ?? null,
    })),
    total,
    page,
    limit,
  });
}

export async function createReport(req, res) {
  const body = req.body ?? {};
  const title = optionalString(body.title);
  if (!title) badRequest("title is required.", "title");
  const period = MARKETING_REPORT_PERIODS.includes(body.period) ? body.period : "weekly";

  const accountId = Number(body.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await assertScopedAccountAccess(req.user, accountId);
  const account = await resolveAccount(accountId);
  const companyId = account.companyId;

  const id = await getNextSequence("marketing_reports");
  const doc = await marketingReportsTable.create({
    id,
    accountId,
    companyId,
    title,
    period,
    generatedAt: body.generatedAt ? new Date(body.generatedAt) : new Date(),
    createdBy: req.user.id,
  });

  res.status(201).json({
    id: String(doc.id),
    title: doc.title,
    period: doc.period,
    generatedAt: toIso(doc.generatedAt),
  });
}

export async function updateReport(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingReportsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Report");
  if (doc.accountId == null) {
    badRequest("This report is not linked to a digital project. Recreate it under a project.", "accountId");
  }
  assertDocAccount(doc, accountId);
  const body = req.body ?? {};
  if (body.title != null) {
    const title = optionalString(body.title);
    if (!title) badRequest("title is required.", "title");
    doc.title = title;
  }
  if (MARKETING_REPORT_PERIODS.includes(body.period)) doc.period = body.period;
  await doc.save();
  res.json({
    id: String(doc.id),
    title: doc.title,
    period: doc.period,
    generatedAt: toIso(doc.generatedAt),
  });
}

export async function deleteReport(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingReportsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Report");
  if (doc.accountId == null) {
    badRequest("This report is not linked to a digital project. Recreate it under a project.", "accountId");
  }
  assertDocAccount(doc, accountId);

  const isSuperAdminOrHr = req.user.role === "super_admin" || req.user.role === "hr" || req.user.role === "manager";
  const isCreator = doc.createdBy != null && Number(doc.createdBy) === Number(req.user.id);
  const subRoleLower = (req.user.subType ?? "").toLowerCase();
  const isAccountManager = subRoleLower.includes("account_manager");

  if (!isSuperAdminOrHr && !isCreator && !isAccountManager) {
    forbidden("Only report creators, account managers, or admins can delete reports.");
  }

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  res.json({ ok: true });
}

