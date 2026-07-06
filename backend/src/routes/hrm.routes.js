import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import { requirePermission, requireAnyPermission } from "../middlewares/permission.js";
import { requireHrmAccess } from "../middlewares/hrm-permission.js";
import * as hrm from "../controllers/hrm.controller.js";

const router = Router();

// Only apply HRM auth to /hrm/* — this router is mounted on the global API router
// without a path prefix, so skip unrelated requests (e.g. public sales proposal links).
router.use((req, res, next) => {
  if (!req.path.startsWith("/hrm")) return next("router");
  next();
}, requireAuth, requireHrmAccess);
const perm = requirePermission;

router.get("/hrm/departments", perm("hrm_departments", "view"), asyncHandler(hrm.getDepartments));
router.post("/hrm/departments", perm("hrm_departments", "create"), asyncHandler(hrm.postDepartment));
router.patch("/hrm/departments/:id", perm("hrm_departments", "edit"), asyncHandler(hrm.patchDepartment));
router.delete("/hrm/departments/:id", perm("hrm_departments", "delete"), asyncHandler(hrm.deleteDepartment));

router.get(
  "/hrm/leave/types",
  requireAnyPermission(["hrm_leave", "view"], ["hrm_my_leave", "view"]),
  asyncHandler(hrm.getLeaveTypes),
);
router.get("/hrm/leave/balances", asyncHandler(hrm.getLeaveBalances));
router.get("/hrm/leave/requests", asyncHandler(hrm.getLeaveRequests));
router.post("/hrm/leave/requests", asyncHandler(hrm.postLeaveRequest));
router.patch("/hrm/leave/requests/:id", perm("hrm_leave", "approve"), asyncHandler(hrm.patchLeaveRequest));
router.post("/hrm/leave/requests/:id/cancel", asyncHandler(hrm.cancelLeaveRequest));

router.get("/hrm/wfh/requests", asyncHandler(hrm.getWfhRequests));
router.post("/hrm/wfh/requests", asyncHandler(hrm.postWfhRequest));
router.patch("/hrm/wfh/requests/:id", perm("hrm_wfh", "approve"), asyncHandler(hrm.patchWfhRequest));
router.post("/hrm/wfh/requests/:id/cancel", asyncHandler(hrm.cancelWfhRequest));

router.get("/hrm/shifts/templates", perm("hrm_shifts", "view"), asyncHandler(hrm.getShiftTemplates));
router.post("/hrm/shifts/templates", perm("hrm_shifts", "create"), asyncHandler(hrm.postShiftTemplate));
router.patch("/hrm/shifts/templates/:id", perm("hrm_shifts", "edit"), asyncHandler(hrm.patchShiftTemplate));
router.get("/hrm/shifts/assignments", perm("hrm_shifts", "view"), asyncHandler(hrm.getShiftAssignments));
router.post("/hrm/shifts/assignments", perm("hrm_shifts", "edit"), asyncHandler(hrm.postShiftAssignment));

router.get("/hrm/holidays", asyncHandler(hrm.getHolidays));
router.post("/hrm/holidays", perm("hrm_holidays", "create"), asyncHandler(hrm.postHoliday));
router.patch("/hrm/holidays/:id", perm("hrm_holidays", "edit"), asyncHandler(hrm.patchHoliday));
router.delete("/hrm/holidays/:id", perm("hrm_holidays", "delete"), asyncHandler(hrm.deleteHoliday));

router.get("/hrm/calendar", asyncHandler(hrm.getCalendar));
router.post(
  "/hrm/calendar/generate-sundays",
  perm("hrm_holidays", "create"),
  asyncHandler(hrm.postGenerateSundayHolidays),
);

router.get("/hrm/dashboard", perm("hrm_dashboard", "view"), asyncHandler(hrm.getDashboard));
router.get("/hrm/attendance/daily", asyncHandler(hrm.getAttendanceDaily));
router.get("/hrm/attendance/variance", perm("hrm_attendance", "view"), asyncHandler(hrm.getAttendanceVariance));
router.get("/hrm/attendance/corrections", asyncHandler(hrm.getAttendanceCorrections));
router.post("/hrm/attendance/corrections", asyncHandler(hrm.postAttendanceCorrection));
router.patch("/hrm/attendance/corrections/:id", perm("hrm_attendance", "approve"), asyncHandler(hrm.patchAttendanceCorrection));
router.post(
  "/hrm/attendance/daily/:userId/:date/excuse-late",
  requireAnyPermission(["hrm_attendance", "edit"], ["hrm_attendance", "approve"]),
  asyncHandler(hrm.postAttendanceLateExcuse),
);
router.patch(
  "/hrm/attendance/daily/:userId/:date",
  requireAnyPermission(["hrm_attendance", "edit"], ["hrm_attendance", "approve"]),
  asyncHandler(hrm.patchAttendanceDailyOverride),
);

router.get("/hrm/payroll/structures", perm("hrm_payroll", "view"), asyncHandler(hrm.getSalaryStructures));
router.get("/hrm/payroll/org-overview", perm("hrm_payroll", "view"), asyncHandler(hrm.getOrgPayrollOverview));
router.put("/hrm/payroll/structures/:userId", perm("hrm_payroll", "edit"), asyncHandler(hrm.putSalaryStructure));
router.get("/hrm/payroll/runs", perm("hrm_payroll", "view"), asyncHandler(hrm.getPayrollRuns));
router.get("/hrm/payroll/checklist", perm("hrm_payroll", "view"), asyncHandler(hrm.getPayrollChecklistByPeriod));
router.post("/hrm/payroll/runs", perm("hrm_payroll", "create"), asyncHandler(hrm.postPayrollRun));
router.get("/hrm/payroll/runs/:id/lines", perm("hrm_payroll", "view"), asyncHandler(hrm.getPayrollRunLines));
router.get("/hrm/payroll/runs/:id/checklist", perm("hrm_payroll", "view"), asyncHandler(hrm.getPayrollChecklist));
router.patch("/hrm/payroll/lines/:lineId", perm("hrm_payroll", "edit"), asyncHandler(hrm.patchPayrollLine));
router.post("/hrm/payroll/runs/:id/review", perm("hrm_payroll", "edit"), asyncHandler(hrm.postPayrollReview));
router.post("/hrm/payroll/runs/:id/finalize", perm("hrm_payroll", "finalize"), asyncHandler(hrm.postPayrollFinalize));
router.post("/hrm/payroll/runs/:id/revert", perm("hrm_payroll", "finalize"), asyncHandler(hrm.postPayrollRevert));
router.post("/hrm/payroll/runs/:id/regenerate-payslips", perm("hrm_payroll", "finalize"), asyncHandler(hrm.postPayrollRegeneratePayslips));
router.post("/hrm/payroll/runs/:id/paid", perm("hrm_payroll", "finalize"), asyncHandler(hrm.postPayrollPaid));
router.get("/hrm/payroll/runs/:id/export", perm("hrm_payroll", "export"), asyncHandler(hrm.getPayrollExport));
router.get("/hrm/payroll/runs/:id/export/bank", perm("hrm_payroll", "export"), asyncHandler(hrm.getPayrollBankExport));
router.get("/hrm/my-payslips", perm("hrm_my_payslips", "view"), asyncHandler(hrm.getMyPayslips));
router.get("/hrm/payslips", perm("hrm_payroll", "view"), asyncHandler(hrm.getAdminPayslips));
router.get(
  "/hrm/payslips/:id",
  requireAnyPermission(["hrm_my_payslips", "view"], ["hrm_payroll", "view"]),
  asyncHandler(hrm.getPayslipById),
);

router.get("/hrm/recruitment/candidates", perm("hrm_recruitment", "view"), asyncHandler(hrm.getCandidates));
router.post("/hrm/recruitment/candidates", perm("hrm_recruitment", "create"), asyncHandler(hrm.postCandidate));
router.patch("/hrm/recruitment/candidates/:id", perm("hrm_recruitment", "edit"), asyncHandler(hrm.patchCandidate));
router.delete("/hrm/recruitment/candidates/:id", perm("hrm_recruitment", "delete"), asyncHandler(hrm.deleteCandidate));
router.post(
  "/hrm/recruitment/candidates/:id/create-employee",
  perm("hrm_recruitment", "edit"),
  asyncHandler(hrm.postCreateEmployeeFromCandidate),
);
router.post("/hrm/recruitment/candidates/:id/onboarding", perm("hrm_onboarding", "create"), asyncHandler(hrm.postOnboarding));
router.get("/hrm/recruitment/candidates/:id/onboarding", perm("hrm_onboarding", "view"), asyncHandler(hrm.getOnboardingTasks));

router.get("/hrm/onboarding", perm("hrm_onboarding", "view"), asyncHandler(hrm.getOnboardingList));
router.get("/hrm/onboarding/eligible-employees", perm("hrm_onboarding", "create"), asyncHandler(hrm.getOnboardingEligibleEmployees));
router.post("/hrm/onboarding", perm("hrm_onboarding", "create"), asyncHandler(hrm.postOnboardingRecord));
router.get("/hrm/onboarding/:id", perm("hrm_onboarding", "view"), asyncHandler(hrm.getOnboardingRecord));
router.patch("/hrm/onboarding/:id", perm("hrm_onboarding", "edit"), asyncHandler(hrm.patchOnboardingRecord));
router.patch("/hrm/onboarding/:id/tasks/:taskIndex", perm("hrm_onboarding", "edit"), asyncHandler(hrm.patchOnboardingTaskToggle));
router.delete("/hrm/onboarding/:id", perm("hrm_onboarding", "delete"), asyncHandler(hrm.deleteOnboardingRecord));

router.get("/hrm/documents", asyncHandler(hrm.getDocuments));
router.post("/hrm/documents", asyncHandler(hrm.postDocument));
router.patch("/hrm/documents/:id", perm("hrm_documents", "approve"), asyncHandler(hrm.patchDocument));
router.delete("/hrm/documents/:id", asyncHandler(hrm.deleteDocument));

router.get("/hrm/policies", asyncHandler(hrm.getPolicies));
router.post("/hrm/policies", perm("hrm_policies", "create"), asyncHandler(hrm.postPolicy));
router.patch("/hrm/policies/:id", perm("hrm_policies", "edit"), asyncHandler(hrm.patchPolicy));
router.delete("/hrm/policies/:id", perm("hrm_policies", "delete"), asyncHandler(hrm.deletePolicy));
router.post("/hrm/policies/:id/acknowledge", asyncHandler(hrm.postPolicyAck));
router.get("/hrm/policies/my-acknowledgements", asyncHandler(hrm.getMyPolicyAcks));

router.get("/hrm/settings", perm("hrm_settings", "view"), asyncHandler(hrm.getHrmSettings));
router.patch("/hrm/settings", perm("hrm_settings", "edit"), asyncHandler(hrm.patchHrmSettings));
router.get("/hrm/employees", asyncHandler(hrm.getHrmEmployees));
router.get("/hrm/employees/:id", asyncHandler(hrm.getHrmEmployee));
router.post("/hrm/employees/:id/send-credentials", perm("hrm_employees", "edit"), asyncHandler(hrm.postEmployeeCredentials));
router.patch("/hrm/users/:userId/profile", perm("hrm_employees", "edit"), asyncHandler(hrm.patchUserHrmProfile));

router.get("/hrm/audit", perm("hrm_audit", "view"), asyncHandler(hrm.getAuditLogs));

router.get("/hrm/assets", perm("hrm_assets", "view"), asyncHandler(hrm.getAssets));
router.get("/hrm/assets/:id", perm("hrm_assets", "view"), asyncHandler(hrm.getAsset));
router.post("/hrm/assets", perm("hrm_assets", "create"), asyncHandler(hrm.postAsset));
router.patch("/hrm/assets/:id", perm("hrm_assets", "edit"), asyncHandler(hrm.patchAsset));
router.delete("/hrm/assets/:id", perm("hrm_assets", "delete"), asyncHandler(hrm.deleteAsset));

router.get("/hrm/exit", perm("hrm_exit", "view"), asyncHandler(hrm.getExitRequests));
router.get("/hrm/exit/:id", perm("hrm_exit", "view"), asyncHandler(hrm.getExitRequest));
router.post("/hrm/exit", perm("hrm_exit", "create"), asyncHandler(hrm.postExitRequest));
router.patch("/hrm/exit/:id", perm("hrm_exit", "edit"), asyncHandler(hrm.patchExitRequest));
router.post("/hrm/exit/:id/approve", perm("hrm_exit", "approve"), asyncHandler(hrm.postExitApprove));
router.post("/hrm/exit/:id/reject", perm("hrm_exit", "approve"), asyncHandler(hrm.postExitReject));
router.post("/hrm/exit/:id/advance", perm("hrm_exit", "edit"), asyncHandler(hrm.postExitAdvance));
router.post("/hrm/exit/:id/return-assets", perm("hrm_exit", "edit"), asyncHandler(hrm.postExitReturnAssets));
router.post("/hrm/exit/:id/cancel", perm("hrm_exit", "delete"), asyncHandler(hrm.postExitCancel));

router.get("/hrm/letters", perm("hrm_letters", "view"), asyncHandler(hrm.getExperienceLetters));
router.post("/hrm/letters/preview", perm("hrm_letters", "create"), asyncHandler(hrm.postExperienceLetterPreview));
router.post("/hrm/letters", perm("hrm_letters", "create"), asyncHandler(hrm.postExperienceLetter));
router.get("/hrm/letters/:id", perm("hrm_letters", "view"), asyncHandler(hrm.getExperienceLetter));
router.get("/hrm/letters/:id/pdf", perm("hrm_letters", "export"), asyncHandler(hrm.getExperienceLetterPdf));
router.post("/hrm/letters/:id/send", perm("hrm_letters", "edit"), asyncHandler(hrm.postExperienceLetterSend));
router.delete("/hrm/letters/:id", perm("hrm_letters", "delete"), asyncHandler(hrm.deleteExperienceLetter));

export default router;
