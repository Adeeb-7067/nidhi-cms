/**
 * Mirrors backend digital-access helpers — project manage + freelancer directory.
 * Keep aligned with `backend/src/middlewares/digital-access.js`.
 */

type CmsUserLike = {
  id?: number | null;
  role?: string | null;
  subType?: string | null;
} | null | undefined;

function normalizeSubRole(rawSubRole?: string | null): string | null {
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

export function canManageCmsProjects(user?: CmsUserLike): boolean {
  if (!user?.role) return false;
  if (user.role === "super_admin" || user.role === "bde" || user.role === "manager") {
    return true;
  }
  if (user.role === "digital") {
    const sub = normalizeSubRole(user.subType);
    return sub === "account_manager" || sub === "digital_specialist";
  }
  return false;
}

export function canAccessDigitalFreelancerDirectory(user?: CmsUserLike): boolean {
  if (!user?.role) return false;
  if (user.role === "super_admin" || user.role === "hr" || user.role === "finance") {
    return true;
  }
  if (user.role === "digital") {
    return normalizeSubRole(user.subType) === "account_manager";
  }
  return false;
}

/** Ops dashboard / elevated digital lead (AM or specialist). */
export function isDigitalElevatedLead(user?: CmsUserLike): boolean {
  if (!user?.role) return false;
  if (user.role === "super_admin" || user.role === "hr" || user.role === "manager") {
    return true;
  }
  if (user.role === "digital") {
    const sub = normalizeSubRole(user.subType);
    return sub === "account_manager" || sub === "digital_specialist";
  }
  return false;
}

/** Package / retainer commercial fields — super_admin or Account Manager. */
export function canManageMarketingClientCommercial(user?: CmsUserLike): boolean {
  if (!user?.role) return false;
  if (user.role === "super_admin") return true;
  if (user.role === "digital") {
    return normalizeSubRole(user.subType) === "account_manager";
  }
  return false;
}

export function canViewMarketingClientBudget(user?: CmsUserLike): boolean {
  return canManageMarketingClientCommercial(user);
}

/** Only AM / specialist / admin, or project roster Account Manager / workspace AM. */
export function canAssignDigitalTasksToOthers(
  user?: CmsUserLike,
  opts?: {
    projectMemberSubType?: string | null;
    accountManagerId?: number | null;
  },
): boolean {
  if (isDigitalElevatedLead(user)) return true;
  if (
    opts?.accountManagerId != null &&
    user?.id != null &&
    Number(opts.accountManagerId) === Number(user.id)
  ) {
    return true;
  }
  return normalizeSubRole(opts?.projectMemberSubType) === "account_manager";
}

/** Org admins may edit any digital item; AM/craft only edit what they created. */
export function isMarketingOrgAdmin(user?: CmsUserLike): boolean {
  if (!user?.role) return false;
  return user.role === "super_admin" || user.role === "manager" || user.role === "hr";
}

export function canFullyEditMarketingItem(
  user?: CmsUserLike,
  createdBy?: number | string | null,
): boolean {
  if (!user) return false;
  if (isMarketingOrgAdmin(user)) return true;
  if (createdBy == null || user.id == null) return false;
  return String(createdBy) === String(user.id);
}

/**
 * Delete gate: creator, org admin, or elevated digital lead (Account Manager / specialist).
 * Broader than edit — AMs with calendar delete may remove team schedules, not only their own.
 */
export function canDeleteMarketingItem(
  user?: CmsUserLike,
  createdBy?: number | string | null,
): boolean {
  if (!user) return false;
  if (isMarketingOrgAdmin(user) || isDigitalElevatedLead(user)) return true;
  if (createdBy == null || user.id == null) return false;
  return String(createdBy) === String(user.id);
}
