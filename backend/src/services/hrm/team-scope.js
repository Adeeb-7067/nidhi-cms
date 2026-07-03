import { usersTable } from "../../models/schema/index.js";
import { adminStaffRoles, hrmEmployeeRoles, isHrmEmployeeRole } from "../../constants/user-roles.js";
import { forbidden, notFound } from "../../utils/route-errors.js";
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

/** Org-wide attendance visibility (hrm_attendance view permission). */
export async function canViewOrgAttendance(req) {
  if (!req.user) return false;
  if (req.user.role === "super_admin") return true;
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
  if (req.user.role === "super_admin") return;

  // Managers are always scoped to their direct reports, even if their template also
  // grants hrm_employees:view (needed for nav/page visibility) — that grant must not
  // widen a manager's access to the whole org. Checked before the generic bypass below.
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    if (reports.includes(targetUserId)) return;
  }

  if (await userHasPermission(req.user.id, "hrm_employees", "view")) return;
  if (await userHasPermission(req.user.id, "admin_team", "view")) return;

  const target = await usersTable.findOne({ id: targetUserId }, { role: 1 }).lean();
  if (!target) notFound("User");

  if (adminStaffRoles.includes(target.role)) {
    if (await userHasPermission(req.user.id, "sales_team", "view")) return;
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
  if (req.user.role === "super_admin") return null;

  // Checked before the generic hrm_employees:view bypass — a manager's own grant
  // (needed so the Employees nav item/page shows for them) must not widen their
  // scope to the whole org; they always stay limited to their direct reports.
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    const ids = [req.user.id, ...reports];
    const rows = await usersTable
      .find({ id: { $in: ids }, role: { $in: hrmEmployeeRoles } }, { id: 1 })
      .lean();
    return rows.map((r) => r.id);
  }

  if (await userHasPermission(req.user.id, "hrm_employees", "view")) return null;
  forbidden("You cannot access the employee directory.");
}

export async function resolveScopedUserIds(req, requestedUserId) {
  if (requestedUserId != null) {
    const uid = Number(requestedUserId);
    await assertCanAccessUser(req, uid);
    return [uid];
  }
  if (req.user.role === "super_admin") return null;

  // Same precedence as resolveHrmEmployeeScope: manager scoping wins over the
  // generic hrm_employees:view grant so that grant can't widen a manager's access.
  if (req.user.role === "manager") {
    const reports = await getDirectReportIds(req.user.id);
    const ids = [req.user.id, ...reports];
    const rows = await usersTable
      .find({ id: { $in: ids }, role: { $in: hrmEmployeeRoles } }, { id: 1 })
      .lean();
    return rows.map((r) => r.id);
  }

  if (await userHasPermission(req.user.id, "hrm_employees", "view")) return null;
  return [req.user.id];
}
