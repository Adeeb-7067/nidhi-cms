import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireClientAdmin } from "../../../middlewares/auth.js";
import * as clientTeamController from "../controllers/client-team.controller.js";

const router = Router();

// Available to any authenticated user — always returns whether they are
// part of a client company and (if so) what they can see.
router.get(
  "/client-team/me",
  requireAuth,
  asyncHandler(clientTeamController.getClientTeamMe),
);

// Activity log: admins see the whole company, members see only their own.
router.get(
  "/client-team/activity",
  requireAuth,
  asyncHandler(clientTeamController.getClientTeamActivity),
);

// Below: Client Admin only.
router.get(
  "/client-team/members",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.getClientTeamMembers),
);
router.post(
  "/client-team/members",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.postClientTeamMembers),
);
router.get(
  "/client-team/members/:id",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.getClientTeamMemberById),
);
router.patch(
  "/client-team/members/:id",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.patchClientTeamMember),
);
router.patch(
  "/client-team/members/:id/permissions",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.patchClientTeamMemberPermissions),
);
router.delete(
  "/client-team/members/:id",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.deleteClientTeamMember),
);
router.post(
  "/client-team/members/:id/reactivate",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.postClientTeamMemberReactivate),
);
router.post(
  "/client-team/members/:id/resend-invitation",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.postClientTeamMemberResendInvitation),
);
router.post(
  "/client-team/members/:id/reset-password",
  requireAuth,
  asyncHandler(requireClientAdmin),
  asyncHandler(clientTeamController.postClientTeamMemberResetPassword),
);

export default router;
