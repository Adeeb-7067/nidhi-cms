/**
 * Seed one Digital test client with sample tasks, media, posts, approvals, and activity
 * so you can walk the Digital flow in the UI.
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/seed-digital-test-client.mjs
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import {
  getNextSequence,
  clientsTable,
  usersTable,
  projectsTable,
  marketingAccountsTable,
  marketingTasksTable,
  marketingMediaItemsTable,
  marketingPostsTable,
  marketingApprovalsTable,
  marketingActivityTable,
  marketingGraphicsTable,
  marketingVideosTable,
  marketingContentTable,
  marketingCampaignsTable,
  marketingSocialMetricsTable,
  marketingSeoKeywordsTable,
  marketingSeoAuditsTable,
  marketingReportsTable,
} from "../src/models/schema/index.js";
import { bootstrapAccountMediaVault } from "../src/modules/marketing/services/helpers.js";
import { DEFAULT_MEDIA_SUBFOLDERS } from "../src/constants/marketing.js";

const TEST_EMAIL = "digital.flow.test@cms.local";
const TEST_COMPANY = "Digital Flow Test Co";
const TEST_CODE = "DFTTEST";

async function main() {
  await whenDatabaseReady();
  console.log("Seeding Digital Flow test client…");

  const admin =
    (await usersTable.findOne({ role: "super_admin" }).lean()) ||
    (await usersTable.findOne({}).lean());
  if (!admin) {
    throw new Error("No users found — log in as super_admin at least once first.");
  }
  const actorId = admin.id;
  console.log(`Using actor user id=${actorId} (${admin.name ?? admin.email})`);

  // ── Company ────────────────────────────────────────────────────────────
  let company = await clientsTable.findOne({ email: TEST_EMAIL }).lean();
  if (!company) {
    const companyId = await getNextSequence("clients");
    company = (
      await clientsTable.create({
        id: companyId,
        companyName: TEST_COMPANY,
        companyCode: TEST_CODE,
        contactPerson: "Aisha Test",
        primaryContact: "Aisha Test",
        contacts: [
          {
            name: "Aisha Test",
            email: TEST_EMAIL,
            phone: "+91 98765 43210",
            designation: "Brand Manager",
            isPrimary: true,
          },
        ],
        email: TEST_EMAIL,
        phone: "+91 98765 43210",
        address: "12 Demo Street, Bangalore",
        industry: "FMCG",
        website: "https://example.com/digital-flow-test",
        tier: "Premium",
        status: "active",
        customerType: "corporate",
        isVendor: false,
        portalLogin: false,
        createdBy: actorId,
        clientSince: new Date(),
      })
    ).toObject();
    console.log(`Created company id=${company.id} — ${TEST_COMPANY}`);
  } else {
    console.log(`Reusing company id=${company.id} — ${TEST_COMPANY}`);
  }

  // ── Digital project ────────────────────────────────────────────────────
  let project = await projectsTable
    .findOne({ clientId: company.id, type: "digital", name: /Digital Flow/i })
    .lean();
  if (!project) {
    const projectId = await getNextSequence("projects");
    const start = new Date();
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 6);
    project = (
      await projectsTable.create({
        id: projectId,
        name: `${TEST_COMPANY} — Digital Retainer`,
        companyId: company.id,
        clientId: company.id,
        pmId: actorId,
        description: "Test digital marketing retainer for flow analysis",
        status: "in_progress",
        type: "digital",
        priority: "high",
        startDate: start,
        deadline,
        techStack: ["Meta Ads", "Instagram", "SEO"],
      })
    ).toObject();
    console.log(`Created digital project id=${project.id}`);
  } else {
    console.log(`Reusing digital project id=${project.id}`);
  }

  // ── Wipe prior marketing seed for this company (idempotent re-run) ─────
  const oldAccounts = await marketingAccountsTable
    .find({ companyId: company.id })
    .select({ id: 1 })
    .lean();
  const oldIds = oldAccounts.map((a) => a.id);
  if (oldIds.length) {
    await Promise.all([
      marketingTasksTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingMediaItemsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingPostsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingApprovalsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingActivityTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingGraphicsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingVideosTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingContentTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingCampaignsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingSocialMetricsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingSeoKeywordsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingSeoAuditsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingReportsTable.deleteMany({ accountId: { $in: oldIds } }),
      marketingAccountsTable.deleteMany({ id: { $in: oldIds } }),
    ]);
    console.log(`Cleared previous digital seed for company (${oldIds.length} account(s))`);
  }

  // ── Digital account ────────────────────────────────────────────────────
  const accountId = await getNextSequence("marketing_accounts");
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 3);
  await marketingAccountsTable.create({
    id: accountId,
    companyId: company.id,
    projectId: project.id,
    package: "premium",
    accountManagerId: actorId,
    platforms: ["instagram", "facebook", "youtube", "google"],
    monthlyBudgetInr: 180000,
    renewalDate: renewal,
    status: "active",
    industry: "FMCG",
    city: "Bangalore",
    performanceScore: 84,
    notes: "Seeded test account — safe to explore Digital flow end-to-end.",
    createdBy: actorId,
  });
  console.log(`Created digital account id=${accountId}`);

  // ── Media vault + sample files ─────────────────────────────────────────
  await bootstrapAccountMediaVault(accountId, company.id, actorId);
  const folders = await marketingMediaItemsTable
    .find({ accountId, kind: "folder", isDeleted: false })
    .lean();
  const byName = Object.fromEntries(folders.map((f) => [f.name, f]));
  const imagesId = byName["Images"]?.id;
  const docsId = byName["Documents"]?.id;
  const brandId = byName["Brand assets"]?.id;
  const videosId = byName["Videos"]?.id;

  const sampleFiles = [
    {
      parentId: imagesId,
      name: "logo-primary.png",
      kind: "image",
      extension: "png",
      sizeBytes: 245000,
      mimetype: "image/png",
    },
    {
      parentId: imagesId,
      name: "product-hero.jpg",
      kind: "image",
      extension: "jpg",
      sizeBytes: 1850000,
      mimetype: "image/jpeg",
    },
    {
      parentId: docsId,
      name: "creative-brief.pdf",
      kind: "document",
      extension: "pdf",
      sizeBytes: 420000,
      mimetype: "application/pdf",
    },
    {
      parentId: docsId,
      name: "content-calendar.xlsx",
      kind: "document",
      extension: "xlsx",
      sizeBytes: 95000,
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      parentId: brandId,
      name: "brand-guidelines.pdf",
      kind: "document",
      extension: "pdf",
      sizeBytes: 3200000,
      mimetype: "application/pdf",
    },
    {
      parentId: videosId,
      name: "reel-raw-take1.mp4",
      kind: "video",
      extension: "mp4",
      sizeBytes: 48000000,
      mimetype: "video/mp4",
    },
  ];

  for (const f of sampleFiles) {
    if (!f.parentId) continue;
    const id = await getNextSequence("marketing_media");
    await marketingMediaItemsTable.create({
      id,
      accountId,
      companyId: company.id,
      parentId: f.parentId,
      name: f.name,
      kind: f.kind,
      extension: f.extension,
      sizeBytes: f.sizeBytes,
      mimetype: f.mimetype,
      url: null,
      createdBy: actorId,
    });
  }
  console.log(`Media vault ready (${DEFAULT_MEDIA_SUBFOLDERS.join(", ")}) + ${sampleFiles.length} sample files`);

  // ── Tasks ──────────────────────────────────────────────────────────────
  const taskDefs = [
    {
      title: "July Instagram reel — product drop",
      category: "video",
      status: "in_progress",
      priority: "high",
      estimatedHours: 8,
      daysAhead: 5,
    },
    {
      title: "Meta ads — monsoon awareness set",
      category: "ads",
      status: "not_started",
      priority: "urgent",
      estimatedHours: 6,
      daysAhead: 3,
    },
    {
      title: "Blog: 5 summer skincare tips",
      category: "content",
      status: "waiting_client_approval",
      priority: "medium",
      estimatedHours: 4,
      daysAhead: 2,
    },
    {
      title: "Carousel graphics — offer pack",
      category: "graphics",
      status: "completed",
      priority: "medium",
      estimatedHours: 5,
      daysAhead: -2,
    },
    {
      title: "SEO keyword map refresh",
      category: "seo",
      status: "revision",
      priority: "low",
      estimatedHours: 3,
      daysAhead: 10,
    },
  ];

  for (const t of taskDefs) {
    const id = await getNextSequence("marketing_tasks");
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + t.daysAhead);
    await marketingTasksTable.create({
      id,
      accountId,
      companyId: company.id,
      title: t.title,
      category: t.category,
      status: t.status,
      priority: t.priority,
      assigneeId: actorId,
      deadline,
      estimatedHours: t.estimatedHours,
      description: `Seeded task for Digital flow analysis — ${t.category}`,
      createdBy: actorId,
    });
  }
  console.log(`Created ${taskDefs.length} tasks`);

  // ── Calendar posts + approvals ─────────────────────────────────────────
  const postDefs = [
    {
      platform: "instagram",
      caption: "Summer drop is live ☀️ Shop the new collection.",
      hashtags: ["#SummerDrop", "#FMCG", "#TestPost"],
      approvalStage: "client_review",
      scheduleStatus: "pending",
      daysAhead: 2,
    },
    {
      platform: "facebook",
      caption: "Monsoon care tips — save this for later.",
      hashtags: ["#Monsoon", "#Tips"],
      approvalStage: "approved",
      scheduleStatus: "scheduled",
      daysAhead: 4,
    },
    {
      platform: "youtube",
      caption: "Behind the scenes: reel shoot day 1",
      hashtags: ["#BTS"],
      approvalStage: "internal_review",
      scheduleStatus: "pending",
      daysAhead: 7,
    },
  ];

  for (const p of postDefs) {
    const postId = await getNextSequence("marketing_posts");
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + p.daysAhead);
    await marketingPostsTable.create({
      id: postId,
      accountId,
      companyId: company.id,
      platform: p.platform,
      caption: p.caption,
      hashtags: p.hashtags,
      scheduledAt,
      approvalStage: p.approvalStage,
      scheduleStatus: p.scheduleStatus,
      assigneeId: actorId,
      mediaIds: [],
      createdBy: actorId,
    });

    const approvalId = await getNextSequence("marketing_approvals");
    await marketingApprovalsTable.create({
      id: approvalId,
      accountId,
      companyId: company.id,
      title: `Post · ${p.platform}`,
      type: "post",
      refType: "post",
      refId: postId,
      stage: p.approvalStage,
      assigneeId: actorId,
      createdBy: actorId,
    });
  }
  console.log(`Created ${postDefs.length} posts + approvals`);

  // ── Activity feed ──────────────────────────────────────────────────────
  const activities = [
    { message: `Digital account seeded for ${TEST_COMPANY}`, type: "account" },
    { message: "Carousel graphics — offer pack marked completed", type: "task" },
    { message: "Instagram post sent for client review", type: "approval" },
    { message: "Facebook post approved and scheduled", type: "post" },
    { message: "Uploaded sample brand guidelines to Media vault", type: "media" },
  ];
  for (const a of activities) {
    const id = await getNextSequence("marketing_activity");
    await marketingActivityTable.create({
      id,
      accountId,
      companyId: company.id,
      message: a.message,
      actorId,
      type: a.type,
      entityType: "account",
      entityId: accountId,
    });
  }
  console.log(`Created ${activities.length} activity rows`);

  // ── Graphics / Videos / Content queues ─────────────────────────────────
  const dueSoon = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  await marketingGraphicsTable.create({
    id: await getNextSequence("marketing_graphics"),
    accountId,
    companyId: company.id,
    title: "Carousel — monsoon offer pack",
    status: "client_review",
    revisionCount: 1,
    brandGuidelineUrl: "https://example.com/brand-guidelines.pdf",
    fileTypes: ["figma", "png"],
    assigneeId: actorId,
    dueDate: dueSoon(3),
    createdBy: actorId,
  });
  await marketingGraphicsTable.create({
    id: await getNextSequence("marketing_graphics"),
    accountId,
    companyId: company.id,
    title: "Story frames — product drop",
    status: "internal_review",
    revisionCount: 0,
    brandGuidelineUrl: "https://example.com/brand-guidelines.pdf",
    fileTypes: ["psd", "png"],
    assigneeId: actorId,
    dueDate: dueSoon(6),
    createdBy: actorId,
  });

  await marketingVideosTable.create({
    id: await getNextSequence("marketing_videos"),
    accountId,
    companyId: company.id,
    title: "July product reel — take 1",
    renderStatus: "editing",
    hasVoiceover: true,
    hasSubtitles: false,
    hasThumbnail: true,
    exportTarget: "reel",
    assigneeId: actorId,
    dueDate: dueSoon(5),
    createdBy: actorId,
  });
  await marketingVideosTable.create({
    id: await getNextSequence("marketing_videos"),
    accountId,
    companyId: company.id,
    title: "How-to Shorts — skincare",
    renderStatus: "raw_uploaded",
    hasVoiceover: false,
    hasSubtitles: false,
    hasThumbnail: false,
    exportTarget: "shorts",
    assigneeId: actorId,
    dueDate: dueSoon(8),
    createdBy: actorId,
  });

  await marketingContentTable.create({
    id: await getNextSequence("marketing_content"),
    accountId,
    companyId: company.id,
    title: "Blog: 5 summer skincare tips",
    type: "blog",
    status: "client_review",
    seoScore: 78,
    wordCount: 920,
    assigneeId: actorId,
    dueDate: dueSoon(2),
    createdBy: actorId,
  });
  await marketingContentTable.create({
    id: await getNextSequence("marketing_content"),
    accountId,
    companyId: company.id,
    title: "IG captions — July calendar",
    type: "caption",
    status: "internal_review",
    seoScore: 55,
    wordCount: 240,
    assigneeId: actorId,
    dueDate: dueSoon(4),
    createdBy: actorId,
  });
  console.log("Created graphics / videos / content queue items");

  // ── Campaigns ──────────────────────────────────────────────────────────
  await marketingCampaignsTable.create({
    id: await getNextSequence("marketing_campaigns"),
    accountId,
    companyId: company.id,
    network: "meta",
    name: "Monsoon awareness — Meta",
    status: "active",
    budgetInr: 45000,
    objective: "awareness",
    audience: "Women 25-40 · Bangalore+",
    reach: 185000,
    impressions: 620000,
    ctr: 1.8,
    cpc: 12,
    cpm: 180,
    leads: 42,
    roas: 3.2,
    createdBy: actorId,
  });
  await marketingCampaignsTable.create({
    id: await getNextSequence("marketing_campaigns"),
    accountId,
    companyId: company.id,
    network: "meta",
    name: "Lead gen — retargeting",
    status: "paused",
    budgetInr: 22000,
    objective: "leads",
    audience: "Site visitors 30d",
    reach: 42000,
    impressions: 110000,
    ctr: 2.4,
    cpc: 28,
    cpm: 210,
    leads: 68,
    roas: 2.1,
    createdBy: actorId,
  });
  await marketingCampaignsTable.create({
    id: await getNextSequence("marketing_campaigns"),
    accountId,
    companyId: company.id,
    network: "google",
    name: "Brand search — core SKUs",
    status: "active",
    budgetInr: 38000,
    googleType: "search",
    keywords: ["summer skincare", "moisturizer india", "fmcg brand"],
    qualityScore: 8,
    cpa: 320,
    conversions: 54,
    roas: 4.1,
    createdBy: actorId,
  });
  await marketingCampaignsTable.create({
    id: await getNextSequence("marketing_campaigns"),
    accountId,
    companyId: company.id,
    network: "google",
    name: "YouTube — product demo",
    status: "draft",
    budgetInr: 15000,
    googleType: "youtube",
    keywords: ["skincare routine", "product demo"],
    qualityScore: 6,
    cpa: 0,
    conversions: 0,
    roas: 0,
    createdBy: actorId,
  });
  console.log("Created Meta + Google campaigns");

  // ── Social + SEO ───────────────────────────────────────────────────────
  for (const m of [
    {
      platform: "instagram",
      followers: 28400,
      reach: 92000,
      engagement: 4100,
      engagementRate: 4.5,
      bestPostTitle: "Summer drop carousel",
      worstPostTitle: "Office giveaway story",
    },
    {
      platform: "facebook",
      followers: 15200,
      reach: 61000,
      engagement: 1800,
      engagementRate: 3.0,
      bestPostTitle: "Monsoon care tips",
      worstPostTitle: "Static product shot",
    },
    {
      platform: "youtube",
      followers: 6200,
      reach: 34000,
      engagement: 980,
      engagementRate: 2.9,
      bestPostTitle: "BTS reel shoot",
      worstPostTitle: "Unlisted draft cut",
    },
  ]) {
    await marketingSocialMetricsTable.create({
      id: await getNextSequence("marketing_social_metrics"),
      accountId,
      companyId: company.id,
      ...m,
      createdBy: actorId,
    });
  }

  for (const k of [
    {
      keyword: "summer skincare tips",
      currentRank: 8,
      previousRank: 14,
      trend: "up",
      searchVolume: 5400,
      url: "/blog/summer-skincare",
    },
    {
      keyword: "moisturizer for monsoon",
      currentRank: 12,
      previousRank: 11,
      trend: "down",
      searchVolume: 2900,
      url: "/blog/monsoon-care",
    },
    {
      keyword: "fmcg beauty brand india",
      currentRank: 19,
      previousRank: 19,
      trend: "stable",
      searchVolume: 1200,
      url: "/",
    },
  ]) {
    await marketingSeoKeywordsTable.create({
      id: await getNextSequence("marketing_seo_keywords"),
      accountId,
      companyId: company.id,
      ...k,
      createdBy: actorId,
    });
  }

  await marketingSeoAuditsTable.create({
    id: await getNextSequence("marketing_seo_audits"),
    accountId,
    companyId: company.id,
    score: 76,
    issues: 14,
    lastAuditDate: new Date(),
    createdBy: actorId,
  });
  console.log("Created social metrics + SEO keywords/audit");

  // ── Reports ────────────────────────────────────────────────────────────
  for (const r of [
    { title: "Daily stand-up digest", period: "daily", daysAgo: 0 },
    { title: "Weekly client performance pack", period: "weekly", daysAgo: 2 },
    { title: "Monthly retainer summary", period: "monthly", daysAgo: 5 },
  ]) {
    const generatedAt = new Date();
    generatedAt.setDate(generatedAt.getDate() - r.daysAgo);
    await marketingReportsTable.create({
      id: await getNextSequence("marketing_reports"),
      accountId,
      companyId: company.id,
      title: r.title,
      period: r.period,
      generatedAt,
      createdBy: actorId,
    });
  }
  console.log("Created sample reports");

  console.log("\n✅ Digital Flow test client ready");
  console.log("────────────────────────────────────");
  console.log(`Company:  ${TEST_COMPANY} (id=${company.id})`);
  console.log(`Account:  digital id=${accountId} · package=premium`);
  console.log(`Project:  digital id=${project.id}`);
  console.log("Open in app:");
  console.log("  • Digital → Clients / Media / Tasks / Calendar / Approvals");
  console.log("  • Digital → Graphics / Videos / Content");
  console.log("  • Digital → Meta Ads / Google Ads / Social / SEO");
  console.log("  • Digital → Performance / Reports / Dashboard");
  console.log("────────────────────────────────────");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
