/**
 * Hybrid RBAC — shared access context, picker projections, and user-profile ACL.
 * Backend is the source of truth; list/picker may be wider than detail/analytics.
 */
import { projectMembersTable } from "../../models/schema/index.js";
import {
  adminStaffRoles,
  bugAssigneeRoles,
  isDevPortalStaffRole,
} from "../../constants/user-roles.js";
import { forbidden } from "../../utils/route-errors.js";
import { getDirectReportIds } from "../hrm/team-scope.js";
import {
  applyIdScope,
  getAccessibleCompanyIds,
  getAccessibleProjectIds,
} from "./list-scope.js";

/** Minimal fields for assignee / finance / marketing pickers. */
export const STAFF_PICKER_PROJECTION = {
  id: 1,
  employeeId: 1,
  name: 1,
  role: 1,
  subType: 1,
  designation: 1,
  avatarUrl: 1,
  status: 1,
  department: 1,
};

/** Full directory fields for hr / super_admin (existing list shape). */
export const USER_DIRECTORY_PROJECTION = {
  id: 1,
  employeeId: 1,
  name: 1,
  email: 1,
  role: 1,
  subType: 1,
  designation: 1,
  avatarUrl: 1,
  department: 1,
  departmentId: 1,
  reportingManagerId: 1,
  hrmRoleTemplateId: 1,
  roleTemplateId: 1,
  wfhMonthlyLimit: 1,
  phoneNumber: 1,
  joiningDate: 1,
  linkedinUrl: 1,
  githubId: 1,
  status: 1,
  lastLoginAt: 1,
  lastSeenAt: 1,
  createdAt: 1,
};

export const PROJECT_PICKER_PROJECTION = {
  id: 1,
  name: 1,
  status: 1,
  type: 1,
  companyId: 1,
  clientId: 1,
};

export const COMPANY_PICKER_PROJECTION = {
  id: 1,
  name: 1,
  status: 1,
  companyCode: 1,
};

/**
 * @returns {{ projectIds: number[]|null, companyIds: number[]|null }}
 * null = unrestricted on that axis
 */
export async function resolveAccessContext(user) {
  if (!user?.id) {
    return { projectIds: [], companyIds: [] };
  }
  const [projectIds, companyIds] = await Promise.all([
    getAccessibleProjectIds(user),
    getAccessibleCompanyIds(user),
  ]);
  return { projectIds, companyIds };
}

export function isPeopleAdminRole(role) {
  return role === "super_admin" || role === "hr";
}

/** True if viewer and target share at least one project membership. */
export async function shareProjectMembership(viewerId, targetId) {
  if (!viewerId || !targetId || viewerId === targetId) return false;
  const viewerProjects = await projectMembersTable
    .find({ userId: viewerId })
    .select({ projectId: 1 })
    .lean();
  const ids = viewerProjects.map((m) => m.projectId);
  if (!ids.length) return false;
  const shared = await projectMembersTable
    .findOne({ userId: targetId, projectId: { $in: ids } })
    .select({ id: 1 })
    .lean();
  return Boolean(shared);
}

/**
 * Who may GET /users/:id (full profile shape; sensitive fields still gated separately).
 * - self, hr, super_admin
 * - manager of target (direct reports)
 * - same assigned project colleague (delivery / digital collaboration)
 */
export async function assertCanViewUserProfile(viewer, targetUserId) {
  if (!viewer?.id) forbidden("Unauthorized");
  const tid = Number(targetUserId);
  if (viewer.id === tid) return { includeSensitive: true };

  if (isPeopleAdminRole(viewer.role)) {
    return { includeSensitive: true };
  }

  if (viewer.role === "client") {
    forbidden("You can only view your own profile.");
  }

  if (viewer.role === "manager") {
    const reports = await getDirectReportIds(viewer.id);
    if (reports.includes(tid)) {
      return { includeSensitive: false };
    }
  }

  if (await shareProjectMembership(viewer.id, tid)) {
    return { includeSensitive: false };
  }

  forbidden("You cannot view this user's profile.");
}

/**
 * Build Mongo filter + projection for GET /users?staff=1 (Hybrid picker rules).
 * @returns {{ query: object, projection: object, usePickerFormat: boolean }}
 */
export async function buildStaffPickerQuery(viewer) {
  const role = viewer.role;
  const isPeopleAdmin = isPeopleAdminRole(role);

  if (isPeopleAdmin) {
    return {
      query: { role: { $in: adminStaffRoles } },
      projection: USER_DIRECTORY_PROJECTION,
      usePickerFormat: false,
    };
  }

  if (role === "manager") {
    const reports = await getDirectReportIds(viewer.id);
    const ids = [viewer.id, ...reports];
    return {
      query: { id: { $in: ids }, role: { $in: adminStaffRoles } },
      projection: USER_DIRECTORY_PROJECTION,
      usePickerFormat: false,
    };
  }

  if (role === "digital") {
    return {
      query: { role: { $in: ["digital", "freelancer", "manager", "super_admin"] } },
      projection: STAFF_PICKER_PROJECTION,
      usePickerFormat: true,
    };
  }

  // finance / bde / delivery — assignee-style picker, not full directory PII
  if (
    role === "finance" ||
    role === "bde" ||
    isDevPortalStaffRole(role)
  ) {
    const pickerRoles =
      role === "finance"
        ? adminStaffRoles
        : role === "bde"
          ? adminStaffRoles
          : [...new Set([...bugAssigneeRoles, "manager", "qa", "tester", "super_admin"])];
    return {
      query: { role: { $in: pickerRoles } },
      projection: STAFF_PICKER_PROJECTION,
      usePickerFormat: true,
    };
  }

  forbidden("You cannot list staff users.");
}

export function formatStaffPickerUser(user) {
  return {
    id: user.id,
    employeeId: user.employeeId ?? null,
    name: user.name,
    role: user.role,
    subType: user.subType ?? null,
    designation: user.designation ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    department: user.department ?? null,
  };
}

export { applyIdScope, getAccessibleCompanyIds, getAccessibleProjectIds };
