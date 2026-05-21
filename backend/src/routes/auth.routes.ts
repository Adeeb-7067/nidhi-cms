import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as authController from "@/controllers/auth.controller";
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again in 1 hour." },
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh attempts. Please try again shortly." },
});
const router: IRouter = Router();
router.post("/auth/login", loginLimiter, asyncHandler(authController.postAuthLogin));
router.post("/auth/logout", requireAuth, asyncHandler(authController.postAuthLogout));
router.post("/auth/refresh", refreshLimiter, asyncHandler(authController.postAuthRefresh));
router.post("/auth/forgot-password", forgotPasswordLimiter, asyncHandler(authController.postAuthForgotPassword));
router.post("/auth/reset-password", asyncHandler(authController.postAuthResetPassword));
router.post("/auth/fcm-token", requireAuth, asyncHandler(authController.postAuthFcmToken));
router.post("/auth/impersonate/:userId", requireAuth, requireRole("super_admin"), asyncHandler(authController.postAuthImpersonateByUserId));
router.post("/auth/stop-impersonate", requireAuth, asyncHandler(authController.postAuthStopImpersonate));
router.get("/auth/me", requireAuth, asyncHandler(authController.getAuthMe));
router.patch("/auth/me", requireAuth, asyncHandler(authController.patchAuthMe));

export default router;
