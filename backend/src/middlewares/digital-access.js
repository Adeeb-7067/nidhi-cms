import { forbidden } from "../utils/route-errors.js";

/**
 * Granular module permissions for Digital sub-roles.
 * Super Admin retains 100% unscoped access regardless of these definitions.
 *
 * Keep this tighter than the system "digital" template (which seeds full marketing_*).
 * Effective grants = template ∩ sub-role modules (+ action demotion in permissions.service).
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
  /** Ops lead — almost AM, but no commercial reports / freelancer directory. */
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
  ],
  designer: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_content",
    "marketing_approvals",
  ],
  video_editor: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_content",
    "marketing_approvals",
  ],
  content_creator: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_content",
    "marketing_approvals",
  ],
  seo_expert: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_calendar",
    "marketing_seo",
    "marketing_analytics",
    "marketing_approvals",
  ],
  ads_manager: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_calendar",
    "marketing_ads",
    "marketing_analytics",
    "marketing_approvals",
  ],
  /** Digital freelancer sub-type (role may still be digital). */
  freelancer: [
    "marketing_dashboard",
    "marketing_clients",
    "marketing_tasks",
    "marketing_media",
    "marketing_calendar",
    "marketing_approvals",
  ],
};

/** Sub-roles that may mutate project/workspace settings (not just view). */
const DIGITAL_PROJECT_MANAGE_SUBROLES = new Set(["account_manager", "digital_specialist"]);

/** Sub-roles that may delete / approve / export on digital modules. */
const DIGITAL_ELEVATED_ACTION_SUBROLES = new Set(["account_manager", "digital_specialist"]);

/** Sub-roles that may open the freelancer directory from Digital. */
const DIGITAL_FREELANCER_DIR_SUBROLES = new Set(["account_manager"]);

export function normalizeSubRole(rawSubRole) {
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

/**
 * Modules this digital/freelancer user may access.
 * Unknown / missing subType → designer (minimal), never Account Manager.
 */
export function getDigitalSubRoleModules(user) {
  if (!user) return [];
  if (user.role === "super_admin") {
    return [...new Set(Object.values(DIGITAL_ROLE_PERMISSIONS).flat())];
  }
  const subRoleKey = normalizeSubRole(user.subType);
  if (subRoleKey && DIGITAL_ROLE_PERMISSIONS[subRoleKey]) {
    return DIGITAL_ROLE_PERMISSIONS[subRoleKey];
  }
  // role=freelancer without a known specialty → freelancer pack
  if (user.role === "freelancer") {
    return DIGITAL_ROLE_PERMISSIONS.freelancer;
  }
  return DIGITAL_ROLE_PERMISSIONS.designer;
}

export function checkDigitalModuleAccess(user, requiredModule) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "digital" && user.role !== "freelancer") return true;
  const allowed = getDigitalSubRoleModules(user);
  return allowed.includes(requiredModule);
}

/** Who may create/update CMS projects and manage members (matches project routes). */
export function canManageCmsProjects(user) {
  if (!user) return false;
  if (user.role === "super_admin" || user.role === "bde" || user.role === "manager") {
    return true;
  }
  if (user.role === "digital") {
    const subType = normalizeSubRole(user.subType);
    return DIGITAL_PROJECT_MANAGE_SUBROLES.has(subType);
  }
  return false;
}

export function canAccessDigitalFreelancerDirectory(user) {
  if (!user) return false;
  if (user.role === "super_admin" || user.role === "hr" || user.role === "finance") {
    return true;
  }
  if (user.role === "digital") {
    return DIGITAL_FREELANCER_DIR_SUBROLES.has(normalizeSubRole(user.subType));
  }
  return false;
}

/** Ops lead — AM or digital specialist (full task edit, elevated dashboard). */
export function isDigitalElevatedLead(user) {
  if (!user) return false;
  if (user.role === "super_admin" || user.role === "hr" || user.role === "manager") {
    return true;
  }
  if (user.role === "digital") {
    return DIGITAL_ELEVATED_ACTION_SUBROLES.has(normalizeSubRole(user.subType));
  }
  return false;
}

/**
 * Craft digital / freelancers may only list tasks assigned to them.
 * Elevated leads (and non-digital staff) keep team-wide visibility within account scope.
 */
export function shouldRestrictToOwnDigitalTasks(user) {
  if (!user) return false;
  if (isDigitalElevatedLead(user)) return false;
  return user.role === "digital" || user.role === "freelancer";
}

/**
 * Craft staff cannot assign work to others — always self.
 * Pass `allowAssignOthers` when user is project Account Manager (or global lead already skips restrict).
 */
export function resolveDigitalTaskAssigneeId(user, requestedAssigneeId, { allowAssignOthers = false } = {}) {
  if (!allowAssignOthers && shouldRestrictToOwnDigitalTasks(user)) {
    return Number(user.id);
  }
  if (requestedAssigneeId == null || requestedAssigneeId === "") return null;
  const n = Number(requestedAssigneeId);
  return Number.isFinite(n) ? n : null;
}

/**
 * Demote template actions for digital specialists who should not act like super admin.
 * View stays for allowed modules; create/edit kept for craft roles; delete/approve/export
 * reserved for AM / specialist.
 */
export function filterDigitalPermissionSet(user, permissionSet) {
  if (!user || (user.role !== "digital" && user.role !== "freelancer")) {
    return permissionSet;
  }

  const allowedModules = new Set(getDigitalSubRoleModules(user));
  const sub = normalizeSubRole(user.subType);
  const elevated = DIGITAL_ELEVATED_ACTION_SUBROLES.has(sub);
  const canManageProjects = canManageCmsProjects(user);
  const canFreelancerDir = canAccessDigitalFreelancerDirectory(user);

  for (const key of [...permissionSet]) {
    const sep = key.lastIndexOf(":");
    if (sep < 0) continue;
    const mod = key.slice(0, sep);
    const action = key.slice(sep + 1);

    if (mod.startsWith("marketing_")) {
      if (!allowedModules.has(mod)) {
        permissionSet.delete(key);
        continue;
      }
      if (!elevated && (action === "delete" || action === "approve" || action === "export")) {
        permissionSet.delete(key);
        continue;
      }
      // Craft roles: dashboard is view-only (avoids admin ops shell via :edit).
      if (!elevated && mod === "marketing_dashboard" && action !== "view") {
        permissionSet.delete(key);
        continue;
      }
      if (
        mod === "marketing_clients" &&
        !canManageProjects &&
        (action === "create" || action === "edit" || action === "delete")
      ) {
        permissionSet.delete(key);
      }
      continue;
    }

    if (mod === "finance_freelancers" && !canFreelancerDir) {
      permissionSet.delete(key);
    }
  }

  return permissionSet;
}

export function checkDigitalResourceOwnership(user, resource) {
  if (!user) return false;
  if (user.role === "super_admin") return true;

  const subRole = normalizeSubRole(user.subType);
  if (subRole === "freelancer" || user.role === "freelancer") {
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
 * Express middleware: digital / freelancer must be allowed `requiredModule` by sub-role.
 * Super Admin and non-digital roles bypass.
 */
export function requireDigitalModuleAccess(requiredModule) {
  return (req, _res, next) => {
    if (!req.user) return next();
    if (req.user.role === "super_admin") return next();
    if (req.user.role !== "digital" && req.user.role !== "freelancer") return next();
    if (!checkDigitalModuleAccess(req.user, requiredModule)) {
      return forbidden("Your role does not have access to this module.");
    }
    next();
  };
}
