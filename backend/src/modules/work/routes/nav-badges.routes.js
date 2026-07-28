import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../../middlewares/auth.js";
import { resourceRequestsTable, bugsTable } from "../../../models/schema/index.js";
import {
  isDevPortalStaffRole,
  isDeveloperRole,
} from "../../../constants/user-roles.js";
import { userHasPermission } from "../../identity/services/permissions.service.js";
import { getAccessibleProjectIds, applyIdScope } from "../../access/services/list-scope.js";

const router = Router();

async function canViewAllRequests(user) {
  if (user.role === "super_admin") return true;
  return userHasPermission(user.id, "admin_requests", "view");
}

async function pendingRequestsFilter(user) {
  const query = { status: "pending" };
  if (!(await canViewAllRequests(user))) {
    if (isDeveloperRole(user.role) || user.role === "client") {
      query.developerId = user.id;
    } else {
      const projectIds = await getAccessibleProjectIds(user);
      if (projectIds === null) {
        query.developerId = user.id;
      } else if (!applyIdScope(query, "projectId", projectIds)) {
        return null;
      }
    }
  }
  return query;
}

/**
 * Lightweight nav badge totals — one round-trip instead of limit:1 list calls.
 * GET /api/nav/badges
 */
async function getNavBadges(req, res) {
  const role = req.user.role;
  const out = { pendingRequests: 0, openBugs: 0 };

  if (role === "super_admin") {
    const filter = await pendingRequestsFilter(req.user);
    if (filter) {
      out.pendingRequests = await resourceRequestsTable.countDocuments(filter);
    }
  }

  if (role === "super_admin" || isDevPortalStaffRole(role)) {
    if (role === "super_admin") {
      out.openBugs = await bugsTable.countDocuments({ status: "open" });
    } else {
      const projectIds = await getAccessibleProjectIds(req.user);
      if (projectIds === null) {
        out.openBugs = await bugsTable.countDocuments({ status: "open" });
      } else if (projectIds.length) {
        out.openBugs = await bugsTable.countDocuments({
          status: "open",
          projectId: { $in: projectIds },
        });
      }
    }
  }

  res.json(out);
}

router.get("/nav/badges", requireAuth, asyncHandler(getNavBadges));

export default router;
