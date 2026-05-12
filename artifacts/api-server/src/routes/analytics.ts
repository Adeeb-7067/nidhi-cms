import { Router } from "express";
import { db } from "../lib/db";
import {
  projectsTable, clientsTable, usersTable, bugsTable, dailyLogsTable,
  apkSchedulesTable, resourceRequestsTable, projectMembersTable, auditLogsTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc, isNull, gte, lte, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/analytics/dashboard
router.get("/analytics/dashboard", requireAuth, requireRole("super_admin"), async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const [
    activeProjects,
    totalClients,
    overdueProjects,
    openBugs,
    openRequests,
    apksDueToday,
    pipeline,
    bugSeverity,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(projectsTable).where(eq(projectsTable.status, "in_progress")),
    db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(eq(clientsTable.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(projectsTable).where(and(sql`${projectsTable.deadline} < now()`, sql`${projectsTable.status} != 'completed'`)),
    db.select({ count: sql<number>`count(*)` }).from(bugsTable).where(eq(bugsTable.status, "open")),
    db.select({ count: sql<number>`count(*)` }).from(resourceRequestsTable).where(eq(resourceRequestsTable.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(apkSchedulesTable).where(sql`date(${apkSchedulesTable.scheduledDate}) = current_date`),
    db.select({ status: projectsTable.status, count: sql<number>`count(*)` }).from(projectsTable).groupBy(projectsTable.status),
    db.select({ severity: bugsTable.severity, count: sql<number>`count(*)` }).from(bugsTable).where(eq(bugsTable.status, "open")).groupBy(bugsTable.severity),
  ]);

  const pipelineMap: Record<string, number> = {};
  for (const row of pipeline) {
    pipelineMap[row.status] = Number(row.count);
  }

  const severityMap: Record<string, number> = {};
  for (const row of bugSeverity) {
    severityMap[row.severity] = Number(row.count);
  }

  // Recent activity from audit logs
  const recentActivity = await db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      entityType: auditLogsTable.entityType,
      entityId: auditLogsTable.entityId,
      createdAt: auditLogsTable.createdAt,
      actorName: usersTable.name,
      actorAvatarUrl: usersTable.avatarUrl,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(usersTable.id, auditLogsTable.actorId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(10);

  res.json({
    activeProjects: Number(activeProjects[0].count),
    totalClients: Number(totalClients[0].count),
    teamMembersOnline: 0,
    overdueProjects: Number(overdueProjects[0].count),
    apksDueToday: Number(apksDueToday[0].count),
    openBugs: Number(openBugs[0].count),
    openRequests: Number(openRequests[0].count),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      actorName: a.actorName ?? "System",
      actorAvatarUrl: a.actorAvatarUrl ?? null,
      action: a.action,
      entityType: a.entityType,
      entityName: `${a.entityType} #${a.entityId}`,
      timestamp: a.createdAt.toISOString(),
    })),
    projectPipeline: {
      scoping: pipelineMap["scoping"] ?? 0,
      inProgress: pipelineMap["in_progress"] ?? 0,
      uat: pipelineMap["uat"] ?? 0,
      onHold: pipelineMap["on_hold"] ?? 0,
      completed: pipelineMap["completed"] ?? 0,
    },
    bugSeverityBreakdown: {
      critical: severityMap["critical"] ?? 0,
      high: severityMap["high"] ?? 0,
      medium: severityMap["medium"] ?? 0,
      low: severityMap["low"] ?? 0,
    },
  });
});

// GET /api/analytics/projects/:id
router.get("/analytics/projects/:id", requireAuth, async (req, res) => {
  const projectId = parseInt(req.params['id'] as string);

  const members = await db
    .select({
      userId: projectMembersTable.userId,
      completionPct: projectMembersTable.completionPct,
      name: usersTable.name,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, projectMembersTable.userId))
    .where(eq(projectMembersTable.projectId, projectId));

  const logs = await db
    .select({
      logDate: dailyLogsTable.logDate,
      hoursSpent: dailyLogsTable.hoursSpent,
      completionPct: dailyLogsTable.completionPct,
      workCategories: dailyLogsTable.workCategories,
      developerId: dailyLogsTable.developerId,
    })
    .from(dailyLogsTable)
    .where(eq(dailyLogsTable.projectId, projectId))
    .orderBy(dailyLogsTable.logDate);

  // Completion over time
  const completionMap = new Map<string, number>();
  for (const log of logs) {
    completionMap.set(log.logDate, log.completionPct);
  }
  const completionOverTime = Array.from(completionMap.entries()).map(([date, value]) => ({ date, value }));

  // Hours per week (group by week)
  const hoursMap = new Map<string, number>();
  for (const log of logs) {
    const week = log.logDate.slice(0, 7); // group by month for simplicity
    hoursMap.set(week, (hoursMap.get(week) ?? 0) + Number(log.hoursSpent));
  }
  const hoursPerWeek = Array.from(hoursMap.entries()).map(([date, value]) => ({ date, value }));

  // Work category breakdown
  const catMap = new Map<string, number>();
  for (const log of logs) {
    for (const cat of log.workCategories) {
      catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
    }
  }
  const workCategoryBreakdown = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));

  // Developer hours
  const devHoursMap = new Map<number, number>();
  for (const log of logs) {
    devHoursMap.set(log.developerId, (devHoursMap.get(log.developerId) ?? 0) + Number(log.hoursSpent));
  }

  const developerContributions = members.map((m) => ({
    developerId: m.userId,
    developerName: m.name,
    completionPct: m.completionPct,
    hoursLogged: devHoursMap.get(m.userId) ?? 0,
  }));

  const totalHoursLogged = logs.reduce((sum, l) => sum + Number(l.hoursSpent), 0);
  const averageCompletionPct = members.length ? Math.round(members.reduce((sum, m) => sum + m.completionPct, 0) / members.length) : 0;

  res.json({ projectId, completionOverTime, developerContributions, workCategoryBreakdown, hoursPerWeek, totalHoursLogged, averageCompletionPct });
});

// GET /api/analytics/team
router.get("/analytics/team", requireAuth, requireRole("super_admin"), async (req, res) => {
  const now = new Date();
  const month = parseInt((req.query.month as string) ?? String(now.getMonth() + 1));
  const year = parseInt((req.query.year as string) ?? String(now.getFullYear()));

  const developers = await db.select().from(usersTable).where(eq(usersTable.role, "developer"));

  const statsPromises = developers.map(async (dev) => {
    const [activeProjects] = await db
      .select({ count: sql<number>`count(distinct ${projectMembersTable.projectId})` })
      .from(projectMembersTable)
      .where(eq(projectMembersTable.userId, dev.id));

    const logs = await db
      .select({ logDate: dailyLogsTable.logDate, hoursSpent: dailyLogsTable.hoursSpent })
      .from(dailyLogsTable)
      .where(and(eq(dailyLogsTable.developerId, dev.id), sql`extract(month from ${dailyLogsTable.logDate}) = ${month}`, sql`extract(year from ${dailyLogsTable.logDate}) = ${year}`));

    const totalHoursThisMonth = logs.reduce((sum, l) => sum + Number(l.hoursSpent), 0);
    const workingDays = 22;
    const utilisationPct = Math.min(100, Math.round((totalHoursThisMonth / (workingDays * 8)) * 100));

    const [lastLog] = await db
      .select({ logDate: dailyLogsTable.logDate })
      .from(dailyLogsTable)
      .where(eq(dailyLogsTable.developerId, dev.id))
      .orderBy(desc(dailyLogsTable.logDate))
      .limit(1);

    return {
      userId: dev.id,
      name: dev.name,
      employeeId: dev.employeeId,
      avatarUrl: dev.avatarUrl,
      subType: dev.subType,
      activeProjects: Number(activeProjects.count),
      totalHoursThisMonth,
      utilisationPct,
      lastLogDate: lastLog?.logDate ?? null,
    };
  });

  const stats = await Promise.all(statsPromises);

  // Heatmap: log activity by date for the current month
  const allLogs = await db
    .select({ logDate: dailyLogsTable.logDate })
    .from(dailyLogsTable)
    .where(and(sql`extract(month from ${dailyLogsTable.logDate}) = ${month}`, sql`extract(year from ${dailyLogsTable.logDate}) = ${year}`));

  const heatMap = new Map<string, number>();
  for (const log of allLogs) {
    heatMap.set(log.logDate, (heatMap.get(log.logDate) ?? 0) + 1);
  }
  const heatmapData = Array.from(heatMap.entries()).map(([date, count]) => ({ date, count }));

  res.json({ developers: stats, heatmapData });
});

// GET /api/analytics/bugs
router.get("/analytics/bugs", requireAuth, async (req, res) => {
  const { projectId } = req.query as Record<string, string>;

  const conditions = [];
  if (projectId) conditions.push(eq(bugsTable.projectId, parseInt(projectId)));

  const [totalOpen, totalFixed, severityDist, statusDist, platformDist] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(bugsTable).where(and(...conditions, eq(bugsTable.status, "open"))),
    db.select({ count: sql<number>`count(*)` }).from(bugsTable).where(and(...conditions, eq(bugsTable.status, "fixed"))),
    db.select({ name: bugsTable.severity, count: sql<number>`count(*)` }).from(bugsTable).where(conditions.length ? and(...conditions) : undefined).groupBy(bugsTable.severity),
    db.select({ name: bugsTable.status, count: sql<number>`count(*)` }).from(bugsTable).where(conditions.length ? and(...conditions) : undefined).groupBy(bugsTable.status),
    db.select({ name: bugsTable.platform, count: sql<number>`count(*)` }).from(bugsTable).where(conditions.length ? and(...conditions) : undefined).groupBy(bugsTable.platform),
  ]);

  res.json({
    totalOpen: Number(totalOpen[0].count),
    totalFixed: Number(totalFixed[0].count),
    severityDistribution: severityDist.map((r) => ({ name: r.name, count: Number(r.count) })),
    statusDistribution: statusDist.map((r) => ({ name: r.name, count: Number(r.count) })),
    platformDistribution: platformDist.map((r) => ({ name: r.name, count: Number(r.count) })),
  });
});

export default router;
