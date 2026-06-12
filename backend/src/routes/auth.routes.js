import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

// Public — no access token required
router.post("/auth/login", asyncHandler(authController.postAuthLogin));
router.post("/auth/logout", asyncHandler(authController.postAuthLogout));
router.post("/auth/refresh", asyncHandler(authController.postAuthRefresh));
router.post("/auth/forgot-password", asyncHandler(authController.postAuthForgotPassword));
router.post("/auth/verify-reset-otp", asyncHandler(authController.postAuthVerifyResetOtp));
router.post("/auth/reset-password", asyncHandler(authController.postAuthResetPassword));

// Authenticated
router.get("/auth/me", requireAuth, asyncHandler(authController.getAuthMe));
router.patch("/auth/me", requireAuth, asyncHandler(authController.patchAuthMe));
router.post("/auth/fcm-token", requireAuth, asyncHandler(authController.postAuthFcmToken));
router.post("/auth/request-change-password-otp", requireAuth, asyncHandler(authController.postAuthRequestChangePasswordOtp));
router.post("/auth/stop-impersonate", requireAuth, asyncHandler(authController.postAuthStopImpersonate));

// Super-admin only
router.post("/auth/impersonate/:userId", requireAuth, requireRole("super_admin"), asyncHandler(authController.postAuthImpersonateByUserId));

export default router;
