import {
  projectsTable,
  projectMembersTable,
  clientsTable,
} from "../../models/schema/index.js";
import { isDevPortalStaffRole, isDeveloperRole } from "../../constants/user-roles.js";
import { findClientCompanyForUser } from "../client-team.js";
import { getScopedDigitalUserAccess } from "../marketing/helpers.js";
import { bdeOwnsCustomer } from "../../utils/sales-bde-customer-scope.js";

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
  const cid = Number(companyId);
  if (role === "super_admin") {
    return { allowed: true, canManage: true, isClient: false };
  }
  // Org ops: read any company; mutations stay role-gated on routes
  if (role === "hr" || role === "finance") {
    return { allowed: true, canManage: false, isClient: false };
  }
  if (role === "digital") {
    const access = await getScopedDigitalUserAccess(req.user);
    const allowed = (access.companyIds ?? []).includes(cid);
    return { allowed, canManage: false, isClient: false };
  }
  if (role === "bde") {
    const client = await clientsTable.findOne({ id: cid }).select({ id: 1, assignedAdminId: 1, createdBy: 1 }).lean();
    const allowed = bdeOwnsCustomer(client, req.user.id);
    return { allowed, canManage: allowed, isClient: false };
  }
  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === cid;
    return { allowed, canManage: false, isClient: true };
  }
  if (isDevPortalStaffRole(role)) {
    const projects = await projectsTable.find({ $or: [{ companyId: cid }, { clientId: cid }] }).select("id").lean();
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
    const allowed = (access.projectIds ?? []).includes(Number(projectId));
    return {
      allowed,
      canManage: allowed && role === "digital",
      isClient: false,
      companyId
    };
  }
  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true, companyId };
  }
  if (role === "finance") {
    // Expense/invoice project linking — read access to any project metadata
    return { allowed: true, canManage: false, isClient: false, companyId };
  }
  if (role === "hr") {
    const member = await projectMembersTable.findOne({ projectId, userId: req.user.id });
    return {
      allowed: !!member,
      canManage: false,
      isClient: false,
      companyId,
    };
  }
  if (isDevPortalStaffRole(role) || role === "bde" || role === "freelancer") {
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
