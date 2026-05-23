import {
  projectsTable,
  projectMembersTable,
  clientsTable
} from "../../models/schema/index.js";
function projectCompanyId(project) {
  return project.companyId ?? project.clientId;
}
async function getClientCompanyForUser(userId) {
  return clientsTable.findOne({ userId });
}
async function getCompanyAccess(req, companyId) {
  if (!req.user) return { allowed: false, canManage: false, isClient: false };
  const role = req.user.role;
  if (role === "super_admin") {
    return { allowed: true, canManage: true, isClient: false };
  }
  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true };
  }
  if (role === "developer" || role === "tester" || role === "qa") {
    const projects = await projectsTable.find({ $or: [{ companyId }, { clientId: companyId }] }).select("id").lean();
    const projectIds = projects.map((p) => p.id);
    if (!projectIds.length) {
      return { allowed: false, canManage: false, isClient: false };
    }
    const member = await projectMembersTable.findOne({
      userId: req.user.id,
      projectId: { $in: projectIds }
    });
    return {
      allowed: !!member,
      canManage: role === "developer",
      isClient: false
    };
  }
  return { allowed: false, canManage: false, isClient: false };
}
async function getProjectAccess(req, projectId) {
  if (!req.user) {
    return { allowed: false, canManage: false, isClient: false, companyId: null };
  }
  const project = await projectsTable.findOne({ id: projectId });
  if (!project) {
    return { allowed: false, canManage: false, isClient: false, companyId: null };
  }
  const companyId = projectCompanyId(project);
  const role = req.user.role;
  if (role === "super_admin") {
    return { allowed: true, canManage: true, isClient: false, companyId };
  }
  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true, companyId };
  }
  if (role === "developer" || role === "tester" || role === "qa") {
    const member = await projectMembersTable.findOne({ projectId, userId: req.user.id });
    return {
      allowed: !!member,
      canManage: role === "developer",
      isClient: false,
      companyId
    };
  }
  return { allowed: false, canManage: false, isClient: false, companyId };
}
function resolveCompanyIdFromBody(body) {
  if (body.companyId != null) return Number(body.companyId);
  if (body.clientId != null) return Number(body.clientId);
  return null;
}
export {
  getClientCompanyForUser,
  getCompanyAccess,
  getProjectAccess,
  projectCompanyId,
  resolveCompanyIdFromBody
};
