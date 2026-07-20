import {
  projectsTable,
  projectMembersTable
} from "../../models/schema/index.js";
import { isDevPortalStaffRole, isDeveloperRole } from "../../constants/user-roles.js";
import { findClientCompanyForUser } from "../client-team.js";
import { getScopedDigitalUserAccess } from "../marketing/helpers.js";

function projectCompanyId(project) {
  return project.companyId ?? project.clientId;
}
/**
 * Resolves the client company for a given user. Recognises both the primary
 * client contact (Clients.userId) and active members of the Client Team
 * Management feature (ClientTeamMembers.userId), so all existing access
 * checks transparently extend to invited team members.
 */
async function getClientCompanyForUser(userId) {
  return findClientCompanyForUser(userId);
}
async function getCompanyAccess(req, companyId) {
  if (!req.user) return { allowed: false, canManage: false, isClient: false };
  const role = req.user.role;
  if (role === "super_admin") {
    return { allowed: true, canManage: true, isClient: false };
  }
  if (role === "digital") {
    const access = await getScopedDigitalUserAccess(req.user);
    const allowed = access.companyIds.includes(Number(companyId));
    return { allowed, canManage: allowed, isClient: false };
  }
  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true };
  }
  if (isDevPortalStaffRole(role)) {
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
      canManage: isDeveloperRole(role),
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
  if (role === "digital") {
    const access = await getScopedDigitalUserAccess(req.user);
    const allowed = access.projectIds.includes(Number(projectId));
    return {
      allowed,
      canManage: allowed,
      isClient: false,
      companyId
    };
  }
  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true, companyId };
  }
  if (isDevPortalStaffRole(role) || role === "bde") {
    const member = await projectMembersTable.findOne({ projectId, userId: req.user.id });
    return {
      allowed: !!member,
      canManage: isDeveloperRole(role) || role === "bde",
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
