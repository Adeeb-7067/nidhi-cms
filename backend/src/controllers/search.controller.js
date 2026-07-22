import {
  usersTable,
  clientsTable,
  projectsTable,
  bugsTable,
  projectMembersTable,
} from "../models/schema/index.js";
import { isDevPortalStaffRole } from "../constants/user-roles.js";
import {
  getAccessibleProjectIds,
  getAccessibleCompanyIds,
} from "../services/access/list-scope.js";

async function getSearch(req, res) {
  const q = (req.query["q"] || "").trim();
  if (!q || q.length < 2) {
    res.json({ projects: [], companies: [], clients: [], employees: [], bugs: [] });
    return;
  }
  const limit = Math.min(parseInt(req.query["limit"] || "5", 10) || 5, 10);
  const regex = { $regex: q, $options: "i" };
  const role = req.user?.role;
  const isPrivileged = role === "super_admin" || role === "hr" || role === "finance";

  const [projectIds, companyIds] = await Promise.all([
    getAccessibleProjectIds(req.user),
    getAccessibleCompanyIds(req.user),
  ]);

  // Empty scope → no results for that entity type
  const projectFilter =
    projectIds === null
      ? { $or: [{ name: regex }, { description: regex }] }
      : projectIds.length
        ? { id: { $in: projectIds }, $or: [{ name: regex }, { description: regex }] }
        : null;

  const clientFilter =
    companyIds === null
      ? { $or: [{ companyName: regex }, { contactPerson: regex }, { email: regex }] }
      : companyIds.length
        ? {
            id: { $in: companyIds },
            $or: [{ companyName: regex }, { contactPerson: regex }, { email: regex }],
          }
        : null;

  // Employees: privileged see staff; others only search within co-members on shared projects
  let employeeFilter = null;
  if (role === "super_admin" || role === "hr") {
    employeeFilter = {
      role: { $ne: "client" },
      $or: [{ name: regex }, { email: regex }],
    };
  } else if (isPrivileged || isDevPortalStaffRole(role) || role === "bde" || role === "digital") {
    const memberProjectIds =
      projectIds === null
        ? (
            await projectMembersTable.find({ userId: req.user.id }).select({ projectId: 1 }).lean()
          ).map((m) => m.projectId)
        : projectIds;
    const peerIds = memberProjectIds.length
      ? (
          await projectMembersTable
            .find({ projectId: { $in: memberProjectIds } })
            .select({ userId: 1 })
            .lean()
        ).map((m) => m.userId)
      : [req.user.id];
    // Digital with no projects: still allow searching digital peers by name for assignees
    if (role === "digital" && !memberProjectIds.length) {
      employeeFilter = {
        role: { $in: ["digital", "freelancer", "manager", "super_admin"] },
        status: "active",
        $or: [{ name: regex }, { email: regex }],
      };
    } else {
      employeeFilter = {
        id: { $in: [...new Set([...peerIds, req.user.id])] },
        $or: [{ name: regex }, { email: regex }],
      };
    }
  }

  let bugFilter = null;
  if (projectIds === null) {
    bugFilter = { $or: [{ title: regex }, { bugNumber: regex }] };
  } else if (projectIds.length) {
    bugFilter = {
      projectId: { $in: projectIds },
      $or: [{ title: regex }, { bugNumber: regex }],
    };
  }

  const [projects, clients, employees, bugs] = await Promise.all([
    projectFilter ? projectsTable.find(projectFilter).limit(limit).lean() : [],
    clientFilter ? clientsTable.find(clientFilter).limit(limit).lean() : [],
    employeeFilter ? usersTable.find(employeeFilter).limit(limit).lean() : [],
    bugFilter ? bugsTable.find(bugFilter).limit(limit).lean() : [],
  ]);

  const formatDate = (d) => (d ? new Date(d).toISOString() : null);
  const includeClientSensitive = role === "super_admin" || role === "hr" || role === "finance";

  res.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      type: p.type || (p.status === "maintenance" ? "maintenance" : "development"),
      priority: p.priority,
      companyId: p.companyId ?? p.clientId,
      clientId: p.clientId,
      deadline: formatDate(p.deadline),
    })),
    companies: clients.map((c) => ({
      id: c.id,
      companyId: c.id,
      companyName: c.companyName,
      companyCode: c.companyCode ?? null,
      contactPerson: c.contactPerson,
      email: includeClientSensitive ? c.email : undefined,
      phone: includeClientSensitive ? c.phone : undefined,
      status: c.status,
      clientSince: formatDate(c.clientSince),
    })),
    clients: clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      email: includeClientSensitive || role === "digital" ? c.email : undefined,
      phone: includeClientSensitive ? c.phone : undefined,
      gstNumber: includeClientSensitive ? (c.gstNumber ?? c.businessId ?? null) : undefined,
      status: c.status,
      clientSince: formatDate(c.clientSince),
    })),
    employees: employees.map((u) => ({
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      avatarUrl: u.avatarUrl,
      status: u.status,
    })),
    bugs: bugs.map((b) => ({
      id: b.id,
      bugNumber: b.bugNumber,
      title: b.title,
      severity: b.severity,
      priority: b.priority,
      status: b.status,
      projectId: b.projectId,
    })),
  });
}

export { getSearch };
