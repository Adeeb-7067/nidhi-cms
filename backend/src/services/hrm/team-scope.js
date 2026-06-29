import { usersTable } from "../../models/schema/index.js";
import { adminStaffRoles, hrmEmployeeRoles, isHrmAdminRole, isHrmEmployeeRole } from "../../constants/user-roles.js";import { forbidden, notFound } from "../../utils/route-errors.js";
import { userHasPermission } from "../permissions.service.js";

export async function assertHrmEmployeeUser(userId) {
  const user = await usersTable.findOne({ id: userId }, { id: 1, role: 1 }).lean();
  if (!user) notFound("Employee");
  if (!isHrmEmployeeRole(user.role)) {
    forbidden("HRM applies to company employees only. Freelancers are managed under Team, not HRM.");
  }
}

export async function getDirectReportIds(managerId) {
  const rows = await usersTable.find({ reportingManagerId: managerId, status: "active" }, { id: 1 }).lean();
  return rows.map((r) => r.id);
}

/** Org-wide attendance visibility (HR admin role or hrm_attendance view permission). */
export async function canViewOrgAttendance(req) {
  if (!req.user) return false;
  if (req.user.role === "super_admin" || isHrmAdminRole(req.user.role)) return true;
  return userHasPermission(req.user.id, "hrm_attendance", "view");
}

export async function assertCanViewAttendanceForUser(req, targetUserId) {
  if (!req.user) forbidden("Unauthorized");
  if (req.user.id === targetUserId) return;
  if (await canViewOrgAttendance(req)) return;
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    if (reports.includes(targetUserId)) return;
  }
  forbidden("You cannot access this employee's attendance.");
}

export async function resolveAttendanceScopedUserIds(req, requestedUserId) {
  if (requestedUserId != null && requestedUserId !== "") {
    const uid = Number(requestedUserId);
    await assertCanViewAttendanceForUser(req, uid);
    return [uid];
  }
  if (await canViewOrgAttendance(req)) return null;
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    return [req.user.id, ...reports];
  }
  return [req.user.id];
}

export async function assertCanAccessUser(req, targetUserId) {
  if (!req.user) forbidden("Unauthorized");
  if (req.user.id === targetUserId) return;
  if (req.user.role === "super_admin" || isHrmAdminRole(req.user.role)) return;
  if (await userHasPermission(req.user.id, "hrm_employees", "view")) return;
  if (await userHasPermission(req.user.id, "admin_team", "view")) return;

  const target = await usersTable.findOne({ id: targetUserId }, { role: 1 }).lean();
  if (!target) notFound("User");

  if (adminStaffRoles.includes(target.role)) {
    if (await userHasPermission(req.user.id, "sales_team", "view")) return;
  }

  if (req.user.role === "manager") {    const reports = await getDirectReportIds(req.user.id);
    if (reports.includes(targetUserId)) return;
  }
  forbidden("You cannot access this employee's data.");
}

export async function assertCanApproveForUser(req, targetUserId) {
  await assertCanAccessUser(req, targetUserId);
}

/**
 * Scope for HRM employee directory list.
 * null = org-wide; array = restricted to those user ids.
 */
export async function resolveHrmEmployeeScope(req) {
  if (!req.user) forbidden("Unauthorized");
  if (isHrmAdminRole(req.user.role)) return null;
  if (await userHasPermission(req.user.id, "hrm_employees", "view")) return null;
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    const ids = [req.user.id, ...reports];
    const rows = await usersTable
      .find({ id: { $in: ids }, role: { $in: hrmEmployeeRoles } }, { id: 1 })
      .lean();
    return rows.map((r) => r.id);
  }
  forbidden("You cannot access the employee directory.");
}

export async function resolveScopedUserIds(req, requestedUserId) {
  if (requestedUserId != null) {
    const uid = Number(requestedUserId);
    await assertCanAccessUser(req, uid);
    return [uid];
  }
  if (isHrmAdminRole(req.user.role)) return null;
  if (await userHasPermission(req.user.id, "hrm_employees", "view")) return null;
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    const ids = [req.user.id, ...reports];
    const rows = await usersTable
      .find({ id: { $in: ids }, role: { $in: hrmEmployeeRoles } }, { id: 1 })
      .lean();
    return rows.map((r) => r.id);
  }
  return [req.user.id];
}
