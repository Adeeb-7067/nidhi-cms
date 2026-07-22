import {
  marketingTasksTable,
  marketingApprovalsTable,
  marketingPostsTable,
  marketingActivityTable,
  marketingCampaignsTable,
  marketingAccountsTable,
  marketingGraphicsTable,
  marketingVideosTable,
  marketingContentTable,
  marketingMediaItemsTable,
  projectsTable,
  usersTable,
  clientsTable,
} from "../../models/schema/index.js";
import { toIso } from "../../utils/mongo-list.js";
import {
  canViewMarketingClientBudget,
  getScopedDigitalUserAccess,
} from "../../services/marketing/helpers.js";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n) {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

function bump(map, key, by = 1) {
  if (key == null || key === "") return;
  map[key] = (map[key] || 0) + by;
}

function entries(map) {
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export async function getDashboard(req, res) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekAgo = daysAgo(7);
  const fourteenAgo = daysAgo(13);
  const monthAgo = daysAgo(30);

  const access = await getScopedDigitalUserAccess(req.user);
  const accountFilter = access.isScoped
    ? { accountId: { $in: access.accountIds.length ? access.accountIds : [-1] } }
    : {};
  const projectFilter = access.isScoped
    ? { id: { $in: access.projectIds.length ? access.projectIds : [-1] } }
    : {};

  const [
    digitalProjectCount,
    openTasks,
    overdueTasks,
    completedThisWeek,
    pendingApprovals,
    postsScheduled,
    postsPublishedMonth,
    adsRunning,
    mediaFiles,
    graphicsCount,
    videosInFlight,
    contentDrafts,
    accounts,
    campaigns,
    activity,
    tasks,
    approvals,
    posts,
    recentTasks,
  ] = await Promise.all([
    projectsTable.countDocuments({ type: "digital", ...projectFilter }),
    marketingTasksTable.countDocuments({
      isDeleted: false,
      status: { $in: ["not_started", "in_progress", "waiting_client_approval", "revision"] },
      ...accountFilter,
    }),
    marketingTasksTable.countDocuments({
      isDeleted: false,
      status: { $nin: ["completed", "cancelled"] },
      deadline: { $ne: null, $lt: todayStart },
      ...accountFilter,
    }),
    marketingTasksTable.countDocuments({
      isDeleted: false,
      status: "completed",
      updatedAt: { $gte: weekAgo },
      ...accountFilter,
    }),
    marketingApprovalsTable.countDocuments({
      isDeleted: false,
      stage: { $in: ["internal_review", "client_review", "revision"] },
      ...accountFilter,
    }),
    marketingPostsTable.countDocuments({
      isDeleted: false,
      scheduleStatus: "scheduled",
      ...accountFilter,
    }),
    marketingPostsTable.countDocuments({
      isDeleted: false,
      scheduleStatus: "published",
      updatedAt: { $gte: monthAgo },
      ...accountFilter,
    }),
    marketingCampaignsTable.countDocuments({
      isDeleted: false,
      status: "active",
      ...accountFilter,
    }),
    marketingMediaItemsTable.countDocuments({
      isDeleted: false,
      kind: { $ne: "folder" },
      ...accountFilter,
    }),
    marketingGraphicsTable.countDocuments({ isDeleted: false, ...accountFilter }),
    marketingVideosTable.countDocuments({
      isDeleted: false,
      renderStatus: { $in: ["editing", "voiceover_pending", "rendering"] },
      ...accountFilter,
    }),
    marketingContentTable.countDocuments({
      isDeleted: false,
      status: { $in: ["internal_review", "client_review", "revision"] },
      ...accountFilter,
    }),
    marketingAccountsTable
      .find({
        isDeleted: false,
        ...(access.isScoped ? { id: { $in: access.accountIds.length ? access.accountIds : [-1] } } : {}),
      })
      .select({
        id: 1,
        companyId: 1,
        projectId: 1,
        package: 1,
        status: 1,
        performanceScore: 1,
        monthlyBudgetInr: 1,
        platforms: 1,
      })
      .lean(),
    marketingCampaignsTable
      .find({ isDeleted: false, ...accountFilter })
      .select({ network: 1, status: 1, budgetInr: 1, reach: 1, impressions: 1, leads: 1 })
      .lean(),
    marketingActivityTable
      .find(
        access.isScoped
          ? {
              $or: [
                { accountId: { $in: access.accountIds.length ? access.accountIds : [-1] } },
                { actorId: access.userId },
              ],
            }
          : {},
      )
      .sort({ createdAt: -1 })
      .limit(16)
      .lean(),
    marketingTasksTable
      .find({ isDeleted: false, ...accountFilter })
      .select({ status: 1, category: 1, priority: 1, createdAt: 1, updatedAt: 1, deadline: 1 })
      .lean(),
    marketingApprovalsTable
      .find({ isDeleted: false, ...accountFilter })
      .select({ stage: 1, type: 1 })
      .lean(),
    marketingPostsTable
      .find({ isDeleted: false, ...accountFilter })
      .select({ platform: 1, scheduleStatus: 1, createdAt: 1 })
      .lean(),
    marketingTasksTable
      .find({
        isDeleted: false,
        status: { $nin: ["completed", "cancelled"] },
        deadline: { $ne: null },
        ...accountFilter,
      })
      .sort({ deadline: 1 })
      .limit(8)
      .select({ id: 1, title: 1, category: 1, priority: 1, status: 1, deadline: 1, companyId: 1 })
      .lean(),
  ]);

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const performanceScore = activeAccounts.length
    ? Math.round(
        activeAccounts.reduce((s, a) => s + Number(a.performanceScore || 0), 0) /
          activeAccounts.length,
      )
    : 0;
  const includeClientBudget = canViewMarketingClientBudget(req.user?.role);
  const totalMonthlyBudget = includeClientBudget
    ? accounts.reduce((s, a) => s + Number(a.monthlyBudgetInr || 0), 0)
    : null;
  const activeBudget = includeClientBudget
    ? activeAccounts.reduce((s, a) => s + Number(a.monthlyBudgetInr || 0), 0)
    : null;

  const tasksByStatusMap = {};
  const tasksByCategoryMap = {};
  const tasksByPriorityMap = {};
  for (const t of tasks) {
    bump(tasksByStatusMap, t.status);
    bump(tasksByCategoryMap, t.category);
    bump(tasksByPriorityMap, t.priority);
  }

  const approvalsByStageMap = {};
  const approvalsByTypeMap = {};
  for (const a of approvals) {
    bump(approvalsByStageMap, a.stage);
    bump(approvalsByTypeMap, a.type);
  }

  const postsByPlatformMap = {};
  const postsByStatusMap = {};
  for (const p of posts) {
    bump(postsByPlatformMap, p.platform);
    bump(postsByStatusMap, p.scheduleStatus);
  }

  const accountsByPackageMap = {};
  const accountsByStatusMap = {};
  for (const a of accounts) {
    bump(accountsByPackageMap, a.package);
    bump(accountsByStatusMap, a.status);
  }

  const campaignsByNetworkMap = {};
  const campaignsByStatusMap = {};
  let campaignBudget = 0;
  let totalReach = 0;
  let totalImpressions = 0;
  let totalLeads = 0;
  for (const c of campaigns) {
    bump(campaignsByNetworkMap, c.network);
    bump(campaignsByStatusMap, c.status);
    campaignBudget += Number(c.budgetInr || 0);
    totalReach += Number(c.reach || 0);
    totalImpressions += Number(c.impressions || 0);
    totalLeads += Number(c.leads || 0);
  }

  // Last 14 days: activity volume + tasks completed (by updatedAt)
  const activityTrendMap = {};
  const completionTrendMap = {};
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(daysAgo(i));
    activityTrendMap[key] = 0;
    completionTrendMap[key] = 0;
  }

  const recentActivityForTrend = await marketingActivityTable
    .find({ createdAt: { $gte: fourteenAgo } })
    .select({ createdAt: 1 })
    .lean();
  for (const a of recentActivityForTrend) {
    const key = dayKey(a.createdAt);
    if (key in activityTrendMap) activityTrendMap[key] += 1;
  }
  for (const t of tasks) {
    if (t.status !== "completed" || !t.updatedAt) continue;
    const key = dayKey(t.updatedAt);
    if (key in completionTrendMap) completionTrendMap[key] += 1;
  }

  const activityTrend = Object.keys(activityTrendMap).map((date) => ({
    date,
    activity: activityTrendMap[date],
    completed: completionTrendMap[date],
  }));

  // Top accounts by performance
  const companyIds = [...new Set(accounts.map((a) => a.companyId).filter(Boolean))];
  const companies = companyIds.length
    ? await clientsTable.find({ id: { $in: companyIds } }).select({ id: 1, companyName: 1 }).lean()
    : [];
  const companyName = new Map(companies.map((c) => [c.id, c.companyName]));

  const topAccounts = [...activeAccounts]
    .sort((a, b) => Number(b.performanceScore || 0) - Number(a.performanceScore || 0))
    .slice(0, 6)
    .map((a) => ({
      id: a.id,
      companyName: companyName.get(a.companyId) ?? `Company #${a.companyId}`,
      package: a.package,
      performanceScore: Number(a.performanceScore || 0),
      monthlyBudgetInr: includeClientBudget ? Number(a.monthlyBudgetInr || 0) : null,
      platforms: a.platforms ?? [],
      status: a.status,
    }));

  const deadlineCompanyIds = [
    ...new Set(recentTasks.map((t) => t.companyId).filter(Boolean)),
  ];
  const missingCompanies = deadlineCompanyIds.filter((id) => !companyName.has(id));
  if (missingCompanies.length) {
    const more = await clientsTable
      .find({ id: { $in: missingCompanies } })
      .select({ id: 1, companyName: 1 })
      .lean();
    for (const c of more) companyName.set(c.id, c.companyName);
  }

  const upcomingDeadlines = recentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    status: t.status,
    deadline: toIso(t.deadline),
    clientName: companyName.get(t.companyId) ?? "—",
    overdue: t.deadline ? new Date(t.deadline) < todayStart : false,
  }));

  const actorIds = [...new Set(activity.map((a) => a.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await usersTable.find({ id: { $in: actorIds } }, { id: 1, name: 1 }).lean()
    : [];
  const actorName = new Map(actors.map((u) => [u.id, u.name]));

  // Digital team (users with role === 'digital')
  const digitalMembers = await usersTable
    .find(
      { role: "digital", isDeleted: { $ne: true } },
      { id: 1, name: 1, email: 1, designation: 1, avatarUrl: 1, image: 1, lastLoginAt: 1, lastSeenAt: 1, status: 1 },
    )
    .lean();

  const digitalTeam = await Promise.all(
    digitalMembers.map(async (u) => {
      const [openTasksCount, doneTasksCount] = await Promise.all([
        marketingTasksTable.countDocuments({
          assigneeId: u.id,
          isDeleted: false,
          status: { $nin: ["completed", "cancelled"] },
        }),
        marketingTasksTable.countDocuments({
          assigneeId: u.id,
          isDeleted: false,
          status: "completed",
        }),
      ]);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        designation: u.designation || "Digital Specialist",
        avatarUrl: u.avatarUrl || u.image || null,
        status: u.status || "active",
        openTasksCount,
        doneTasksCount,
        lastLoginAt: toIso(u.lastLoginAt),
        lastSeenAt: toIso(u.lastSeenAt),
      };
    }),
  );

  res.json({
    kpis: {
      todaysTasks: openTasks,
      openTasks,
      overdueTasks,
      completedThisWeek,
      pendingApprovals,
      adsRunning,
      postsScheduled,
      postsPublishedMonth,
      clientCount: digitalProjectCount,
      accountCount: accounts.length,
      activeAccounts: activeAccounts.length,
      performanceScore,
      totalMonthlyBudget,
      activeBudget,
      mediaFiles,
      graphicsCount,
      videosInFlight,
      contentDrafts,
      campaignBudget,
      totalReach,
      totalImpressions,
      totalLeads,
    },
    tasksByStatus: entries(tasksByStatusMap),
    tasksByCategory: entries(tasksByCategoryMap),
    tasksByPriority: entries(tasksByPriorityMap),
    approvalsByStage: entries(approvalsByStageMap),
    approvalsByType: entries(approvalsByTypeMap),
    postsByPlatform: entries(postsByPlatformMap),
    postsByStatus: entries(postsByStatusMap),
    accountsByPackage: entries(accountsByPackageMap),
    accountsByStatus: entries(accountsByStatusMap),
    campaignsByNetwork: entries(campaignsByNetworkMap),
    campaignsByStatus: entries(campaignsByStatusMap),
    activityTrend,
    topAccounts,
    upcomingDeadlines,
    digitalTeam,
    activity: activity.map((a) => ({
      id: String(a.id),
      message: a.message,
      actor: actorName.get(a.actorId) ?? "Someone",
      timestamp: toIso(a.createdAt),
      type: a.type,
    })),
  });
}
