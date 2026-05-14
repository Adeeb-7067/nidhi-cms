import { Router } from "express";
import { db } from "../lib/db";
import { usersTable, clientsTable, projectsTable, bugsTable } from "@workspace/db/schema";
import { or, like, and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/search?q=...
router.get("/search", requireAuth, async (req, res) => {
  const q = (req.query["q"] as string || "").trim();
  if (!q || q.length < 2) {
    res.json({ projects: [], clients: [], employees: [], bugs: [] });
    return;
  }
  const limit = Math.min(parseInt((req.query["limit"] as string) || "5"), 10);
  const pattern = `%${q}%`;

  const [projects, clients, employees, bugs] = await Promise.all([
    db.select({ id: projectsTable.id, name: projectsTable.name, status: projectsTable.status, priority: projectsTable.priority, completionOverride: projectsTable.completionOverride, description: projectsTable.description, techStack: projectsTable.techStack, clientId: projectsTable.clientId, pmId: projectsTable.pmId, startDate: projectsTable.startDate, deadline: projectsTable.deadline, figmaUrl: projectsTable.figmaUrl, repoUrl: projectsTable.repoUrl, stagingUrl: projectsTable.stagingUrl, productionUrl: projectsTable.productionUrl, createdAt: projectsTable.createdAt, updatedAt: projectsTable.updatedAt })
      .from(projectsTable)
      .where(or(like(projectsTable.name, pattern), like(projectsTable.description, pattern)))
      .limit(limit),
    db.select()
      .from(clientsTable)
      .where(or(like(clientsTable.companyName, pattern), like(clientsTable.contactPerson, pattern), like(clientsTable.email, pattern)))
      .limit(limit),
    db.select({ id: usersTable.id, employeeId: usersTable.employeeId, name: usersTable.name, email: usersTable.email, role: usersTable.role, subType: usersTable.subType, designation: usersTable.designation, avatarUrl: usersTable.avatarUrl, status: usersTable.status, lastLoginAt: usersTable.lastLoginAt, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(and(or(like(usersTable.name, pattern), like(usersTable.email, pattern)), eq(usersTable.role, "developer")))
      .limit(limit),
    db.select({ id: bugsTable.id, bugNumber: bugsTable.bugNumber, title: bugsTable.title, severity: bugsTable.severity, priority: bugsTable.priority, status: bugsTable.status, platform: bugsTable.platform, projectId: bugsTable.projectId, reporterId: bugsTable.reporterId, assigneeId: bugsTable.assigneeId, description: bugsTable.description, buildVersion: bugsTable.buildVersion, createdAt: bugsTable.createdAt, updatedAt: bugsTable.updatedAt, resolvedAt: bugsTable.resolvedAt, stepsToReproduce: bugsTable.stepsToReproduce, expectedBehavior: bugsTable.expectedBehavior, actualBehavior: bugsTable.actualBehavior })
      .from(bugsTable)
      .where(or(like(bugsTable.title, pattern), like(bugsTable.bugNumber, pattern)))
      .limit(limit),
  ]);

  const formatDate = (d: Date | string | null | undefined) => d ? new Date(d).toISOString() : null;
  
  res.json({
    projects: projects.map(p => ({ ...p, startDate: formatDate(p.startDate), deadline: formatDate(p.deadline), createdAt: formatDate(p.createdAt), updatedAt: formatDate(p.updatedAt) })),
    clients: clients.map(c => ({ ...c, createdAt: formatDate(c.createdAt) })),
    employees: employees.map(u => ({ ...u, lastLoginAt: formatDate(u.lastLoginAt), createdAt: formatDate(u.createdAt) })),
    bugs: bugs.map(b => ({ ...b, createdAt: formatDate(b.createdAt), updatedAt: formatDate(b.updatedAt), resolvedAt: formatDate(b.resolvedAt) })),
  });
});

export default router;
