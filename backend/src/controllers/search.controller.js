import { usersTable, clientsTable, projectsTable, bugsTable } from "@/models/schema";
async function getSearch(req, res) {
  const q = (req.query["q"] || "").trim();
  if (!q || q.length < 2) {
    res.json({ projects: [], companies: [], clients: [], employees: [], bugs: [] });
    return;
  }
  const limit = Math.min(parseInt(req.query["limit"] || "5"), 10);
  const regex = { $regex: q, $options: "i" };
  const [projects, clients, employees, bugs] = await Promise.all([
    projectsTable.find({
      $or: [
        { name: regex },
        { description: regex }
      ]
    }).limit(limit),
    clientsTable.find({
      $or: [
        { companyName: regex },
        { contactPerson: regex },
        { email: regex }
      ]
    }).limit(limit),
    usersTable.find({
      role: "developer",
      $or: [
        { name: regex },
        { email: regex }
      ]
    }).limit(limit),
    bugsTable.find({
      $or: [
        { title: regex },
        { bugNumber: regex }
      ]
    }).limit(limit)
  ]);
  const formatDate = (d) => d ? new Date(d).toISOString() : null;
  res.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      type: p.type || (p.status === "maintenance" ? "maintenance" : "development"),
      priority: p.priority,
      completionOverride: p.completionOverride,
      description: p.description,
      techStack: p.techStack,
      companyId: p.companyId ?? p.clientId,
      clientId: p.clientId,
      pmId: p.pmId,
      startDate: formatDate(p.startDate),
      deadline: formatDate(p.deadline),
      figmaUrl: p.figmaUrl,
      repoUrl: p.repoUrl,
      stagingUrl: p.stagingUrl,
      productionUrl: p.productionUrl,
      createdAt: formatDate(p.createdAt),
      updatedAt: formatDate(p.updatedAt)
    })),
    companies: clients.map((c) => ({
      id: c.id,
      companyId: c.id,
      companyName: c.companyName,
      companyCode: c.companyCode ?? null,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      status: c.status,
      clientSince: formatDate(c.clientSince)
    })),
    clients: clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      address: c.address,
      gstNumber: c.gstNumber ?? c.businessId ?? null,
      logoUrl: c.logoUrl,
      status: c.status,
      portalLogin: c.portalLogin,
      clientSince: formatDate(c.clientSince),
      userId: c.userId,
      createdAt: formatDate(c.createdAt)
    })),
    employees: employees.map((u) => ({
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      email: u.email,
      role: u.role,
      subType: u.subType,
      designation: u.designation,
      avatarUrl: u.avatarUrl,
      status: u.status,
      lastLoginAt: formatDate(u.lastLoginAt),
      createdAt: formatDate(u.createdAt)
    })),
    bugs: bugs.map((b) => ({
      id: b.id,
      bugNumber: b.bugNumber,
      title: b.title,
      severity: b.severity,
      priority: b.priority,
      status: b.status,
      platform: b.platform,
      projectId: b.projectId,
      reporterId: b.reporterId,
      assigneeId: b.assigneeId,
      description: b.description,
      buildVersion: b.buildVersion,
      createdAt: formatDate(b.createdAt),
      updatedAt: formatDate(b.updatedAt),
      resolvedAt: formatDate(b.resolvedAt),
      stepsToReproduce: b.stepsToReproduce,
      expectedBehavior: b.expectedBehavior,
      actualBehavior: b.actualBehavior
    }))
  });
}
export {
  getSearch
};
