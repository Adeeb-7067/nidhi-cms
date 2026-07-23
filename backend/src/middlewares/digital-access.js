import { forbidden } from "../utils/route-errors.js";

/**
 * Granular module permissions for Digital sub-roles.
 * Super Admin retains 100% unscoped access regardless of these definitions.
 */
export const DIGITAL_ROLE_PERMISSIONS = {
  account_manager: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_content",
    "marketing_approvals",
    "marketing_ads",
    "marketing_analytics",
    "marketing_seo",
    "marketing_reports",
  ],
  digital_specialist: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_content",
    "marketing_approvals",
    "marketing_ads",
    "marketing_analytics",
    "marketing_seo",
    "marketing_reports",
  ],
  designer: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_content",
  ],
  graphic_designer: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_content",
  ],
  video_editor: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_content",
  ],
  content_creator: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_content",
  ],
  seo_expert: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_seo",
    "marketing_analytics",
  ],
  ads_manager: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_ads",
    "marketing_analytics",
  ],
  freelancer: [
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
  ],
};

function normalizeSubRole(rawSubRole) {
  if (!rawSubRole) return null;
  const s = String(rawSubRole).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (s === "graphic_designer" || s === "designer") return "designer";
  if (s === "video_editor") return "video_editor";
  if (s === "content_creator") return "content_creator";
  if (s === "seo_expert" || s === "seo") return "seo_expert";
  if (s === "ads_manager" || s === "ads") return "ads_manager";
  if (s === "account_manager") return "account_manager";
  if (s === "digital_specialist") return "digital_specialist";
  if (s === "freelancer") return "freelancer";
  return s;
}

export function getDigitalSubRoleModules(user) {
  if (!user) return [];
  if (user.role === "super_admin") {
    return Object.values(DIGITAL_ROLE_PERMISSIONS).flat();
  }
  const subRoleKey = normalizeSubRole(user.subType);
  if (subRoleKey && DIGITAL_ROLE_PERMISSIONS[subRoleKey]) {
    return DIGITAL_ROLE_PERMISSIONS[subRoleKey];
  }
  // Default fallback for digital staff without explicit subType
  return DIGITAL_ROLE_PERMISSIONS.account_manager;
}

export function checkDigitalModuleAccess(user, requiredModule) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const allowed = getDigitalSubRoleModules(user);
  return allowed.includes(requiredModule);
}

export function checkDigitalResourceOwnership(user, resource) {
  if (!user) return false;
  if (user.role === "super_admin") return true;

  const subRole = normalizeSubRole(user.subType);
  if (subRole === "freelancer") {
    if (resource.assigneeId && Number(resource.assigneeId) !== Number(user.id)) {
      return false;
    }
  }

  if (resource.projectId && user.scopedAccess?.projectIds) {
    if (!user.scopedAccess.projectIds.includes(Number(resource.projectId))) {
      return false;
    }
  }

  return true;
}

export function requireDigitalSubRole(...allowedSubRoles) {
  return (req, _res, next) => {
    if (req.user?.role === "super_admin") return next();
    const normalizedUserSubRole = normalizeSubRole(req.user?.subType);
    const normalizedAllowed = allowedSubRoles.map(normalizeSubRole);
    if (!normalizedUserSubRole || !normalizedAllowed.includes(normalizedUserSubRole)) {
      return forbidden("Insufficient digital role permissions for this operation.");
    }
    next();
  };
}

/**
 * Express middleware: enforces that the current user's digital sub-role
 * (from user.subType) is allowed to access `requiredModule`.
 * Super Admins and non-digital roles bypass the check entirely.
 */
export function requireDigitalModuleAccess(requiredModule) {
  return (req, _res, next) => {
    if (!req.user) return next();
    // Super admin bypasses all checks
    if (req.user.role === "super_admin") return next();
    // Only enforce for digital/freelancer roles that have subType
    const subRoleKey = normalizeSubRole(req.user.subType);
    if (!subRoleKey || !DIGITAL_ROLE_PERMISSIONS[subRoleKey]) return next();
    // Check if the sub-role is allowed this module
    const allowed = DIGITAL_ROLE_PERMISSIONS[subRoleKey];
    if (!allowed.includes(requiredModule)) {
      return forbidden("Your role does not have access to this module.");
    }
    next();
  };
}
