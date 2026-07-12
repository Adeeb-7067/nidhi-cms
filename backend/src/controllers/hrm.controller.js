import {
  hrmAuditLogsTable,
  payrollSlipsTable,
  payrollRunsTable,
  leaveRequestsTable,
  wfhRequestsTable,
  attendanceCorrectionsTable,
  employeeDocumentsTable,
  companySettingsTable,
  usersTable,
  notificationsTable,
  getNextSequence,
} from "../models/schema/index.js";
import { notifyUser, broadcast } from "../lib/realtime.js";
import { hrmEmployeeRoles, isHrmAdminRole } from "../constants/user-roles.js";
import * as departmentsService from "../services/hrm/departments.service.js";
import * as leaveService from "../services/hrm/leave.service.js";
import * as wfhService from "../services/hrm/wfh.service.js";
import * as shiftsService from "../services/hrm/shifts.service.js";
import * as holidaysService from "../services/hrm/holidays.service.js";
import * as calendarService from "../services/hrm/calendar.service.js";
import * as attendanceService from "../services/hrm/attendance.service.js";
import * as payrollService from "../services/hrm/payroll.service.js";
import * as manualPayslipService from "../services/hrm/manual-payslip.service.js";
import * as recruitmentService from "../services/hrm/recruitment.service.js";
import * as onboardingService from "../services/hrm/onboarding.service.js";
import * as documentsService from "../services/hrm/documents.service.js";
import * as policiesService from "../services/hrm/policies.service.js";
import * as assetsService from "../services/hrm/assets.service.js";
import * as exitService from "../services/hrm/exit.service.js";
import * as lettersService from "../services/hrm/letters.service.js";
import { resolveScopedUserIds, resolveAttendanceScopedUserIds, assertCanAccessUser, assertCanViewAttendanceForUser, assertHrmEmployeeUser, resolveHrmEmployeeScope } from "../services/hrm/team-scope.js";
import {
  getOrCreateSettings,
  formatSettings,
  invalidateSettingsCache,
} from "../services/company-settings.js";
import { evictUserFromAuthCache } from "../middlewares/auth.js";
import { logHrmAudit } from "../services/hrm/hrm-audit.service.js";
import { userHasPermission } from "../services/permissions.service.js";
import { buildUserProfilePatchSet, buildProfilePatchMongoUpdate } from "../utils/user-profile-fields.js";
import {
  ensureUserLeaveAccrualForPeriod,
  leaveProfileFieldsTouched,
} from "../services/hrm/leave-accrual.service.js";
import * as employeesService from "../services/hrm/employees.service.js";
import * as dashboardService from "../services/hrm/dashboard.service.js";
import { badRequest, forbidden, notFound, parseIdParam, parsePagination } from "../utils/route-errors.js";

const MAX_DATE_RANGE_DAYS = 93;

function parseDateRange(query) {
  const startDate = String(query.startDate ?? query.from ?? "").slice(0, 10);
  const endDate = String(query.endDate ?? query.to ?? "").slice(0, 10);
  if (!startDate || !endDate) badRequest("startDate and endDate are required.");
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    badRequest("Invalid date range.");
  }
  const days = Math.round((end - start) / 86400000) + 1;
  if (days > MAX_DATE_RANGE_DAYS) {
    badRequest(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`);
  }
  if (start > end) badRequest("startDate must be on or before endDate.");
  return { startDate, endDate };
}

async function getDepartments(_req, res) {
  res.json({ departments: await departmentsService.listDepartments() });
}

async function postDepartment(req, res) {
  const dept = await departmentsService.createDepartment(req.body);
  res.status(201).json(dept);
}

async function patchDepartment(req, res) {
  const id = parseIdParam(req.params.id, "department id");
  res.json(await departmentsService.updateDepartment(id, req.body));
}

async function deleteDepartment(req, res) {
  const id = parseIdParam(req.params.id, "department id");
  await departmentsService.deactivateDepartment(id);
  res.json({ message: "Department deactivated" });
}

async function getLeaveTypes(_req, res) {
  res.json({ types: await leaveService.listLeaveTypes() });
}

async function getLeaveBalances(req, res) {
  const userId = req.query.userId != null ? parseIdParam(String(req.query.userId), "user id") : req.user.id;
  await assertCanAccessUser(req, userId);
  await assertHrmEmployeeUser(userId);
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  res.json({ balances: await leaveService.listLeaveBalances(userId, year) });
}

async function getLeaveRequests(req, res) {
  const userIds = await resolveScopedUserIds(req, req.query.userId);
  const status = req.query.status ?? undefined;
  const date = req.query.date ?? undefined;
  const requests = await leaveService.listLeaveRequests({ userIds: userIds ?? undefined, status, date });
  res.json({ requests });
}

async function postLeaveRequest(req, res) {
  const userId = req.body.userId != null ? parseIdParam(String(req.body.userId), "user id") : req.user.id;
  await assertCanAccessUser(req, userId);
  await assertHrmEmployeeUser(userId);
  const request = await leaveService.applyLeaveRequest(userId, req.body, req.user.id);
  res.status(201).json(request);
}

async function patchLeaveRequest(req, res) {
  const id = parseIdParam(req.params.id, "leave request id");
  const row = await leaveRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Leave request");
  await assertCanAccessUser(req, row.userId);
  await leaveService.assertCanReviewLeaveRequest(req.user, row.userId);
  res.json(await leaveService.reviewLeaveRequest(id, req.body, req.user.id));
}

async function cancelLeaveRequest(req, res) {
  const id = parseIdParam(req.params.id, "leave request id");
  res.json(await leaveService.cancelLeaveRequest(id, req.user.id));
}

async function getWfhRequests(req, res) {
  const userIds = await resolveScopedUserIds(req, req.query.userId);
  res.json({
    requests: await wfhService.listWfhRequests({
      userIds: userIds ?? undefined,
      status: req.query.status ?? undefined,
    }),
  });
}

async function postWfhRequest(req, res) {
  const userId = req.body.userId != null ? parseIdParam(String(req.body.userId), "user id") : req.user.id;
  await assertCanAccessUser(req, userId);
  // Allow both HRM employees (manager/developer/tester/qa) AND HRM admins (super_admin/hr)
  // to apply WFH for themselves — only external roles (client, freelancer, bde) are excluded.
  const wfhUser = await usersTable.findOne({ id: userId }, { role: 1 }).lean();
  if (!wfhUser || (!hrmEmployeeRoles.includes(wfhUser.role) && !isHrmAdminRole(wfhUser.role))) {
    forbidden("WFH requests are for company employees only.");
  }
  const request = await wfhService.applyWfhRequest(userId, req.body, req.user.id);
  res.status(201).json(request);
}

async function patchWfhRequest(req, res) {
  const id = parseIdParam(req.params.id, "wfh request id");
  const row = await wfhRequestsTable.findOne({ id }).lean();
  if (!row) notFound("WFH request");
  await assertCanAccessUser(req, row.userId);
  await wfhService.assertCanReviewWfhRequest(req.user, row.userId);
  res.json(await wfhService.reviewWfhRequest(id, req.body, req.user.id));
}

async function cancelWfhRequest(req, res) {
  const id = parseIdParam(req.params.id, "wfh request id");
  res.json(await wfhService.cancelWfhRequest(id, req.user.id));
}

async function getShiftTemplates(_req, res) {
  res.json({ templates: await shiftsService.listShiftTemplates() });
}

async function postShiftTemplate(req, res) {
  res.status(201).json(await shiftsService.createShiftTemplate(req.body));
}

async function patchShiftTemplate(req, res) {
  const id = parseIdParam(req.params.id, "shift template id");
  res.json(await shiftsService.updateShiftTemplate(id, req.body));
}

async function getShiftAssignments(req, res) {
  const userId = req.query.userId != null ? parseIdParam(String(req.query.userId), "user id") : null;
  if (userId) await assertCanAccessUser(req, userId);
  res.json({ assignments: await shiftsService.listShiftAssignments(userId ?? undefined) });
}

async function postShiftAssignment(req, res) {
  const userId = parseIdParam(String(req.body.userId), "user id");
  await assertCanAccessUser(req, userId);
  res.status(201).json(await shiftsService.assignShift({ ...req.body, userId }));
}

async function getHolidays(req, res) {
  res.json({
    holidays: await holidaysService.listHolidays({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      year: req.query.year ? Number(req.query.year) : undefined,
    }),
  });
}

async function postHoliday(req, res) {
  res.status(201).json(await holidaysService.createHoliday(req.body));
}

async function patchHoliday(req, res) {
  const id = parseIdParam(req.params.id, "holiday id");
  res.json(await holidaysService.updateHoliday(id, req.body));
}

async function deleteHoliday(req, res) {
  const id = parseIdParam(req.params.id, "holiday id");
  await holidaysService.deleteHoliday(id);
  res.json({ message: "Holiday deleted" });
}

async function getCalendar(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  if (month < 1 || month > 12) badRequest("Invalid month.");
  res.json(await calendarService.getCalendarMonth(year, month));
}

async function postGenerateSundayHolidays(req, res) {
  const year = Number(req.body?.year ?? req.query.year) || new Date().getFullYear();
  res.json(await calendarService.generateSundayHolidays(year));
}

async function getAttendanceDaily(req, res) {
  const { startDate, endDate } = parseDateRange(req.query);
  const userIds = await resolveAttendanceScopedUserIds(req, req.query.userId);
  const departmentId = req.query.departmentId ? parseIdParam(String(req.query.departmentId), "department id") : undefined;
  res.json(await attendanceService.getAttendanceDailySummaries({
    startDate,
    endDate,
    userIds: userIds ?? undefined,
    departmentId,
  }));
}

async function getAttendanceVariance(req, res) {
  const { startDate, endDate } = parseDateRange(req.query);
  const userIds = await resolveAttendanceScopedUserIds(req, req.query.userId);
  const departmentId = req.query.departmentId
    ? parseIdParam(String(req.query.departmentId), "department id")
    : undefined;

  if (req.query.userId != null || (userIds?.length === 1 && !departmentId)) {
    const userId =
      req.query.userId != null
        ? parseIdParam(String(req.query.userId), "user id")
        : userIds[0];
    await assertCanViewAttendanceForUser(req, userId);
    res.json({ rows: await attendanceService.getAttendanceVsLogsVariance(userId, startDate, endDate) });
    return;
  }

  res.json(
    await attendanceService.getOrgVarianceReport({
      startDate,
      endDate,
      departmentId,
      userIds: userIds ?? undefined,
    }),
  );
}

async function getAttendanceCorrections(req, res) {
  const userIds = await resolveAttendanceScopedUserIds(req, req.query.userId);
  res.json({ corrections: await attendanceService.listCorrections(userIds ?? undefined) });
}

async function postAttendanceCorrection(req, res) {
  const userId = req.body.userId != null ? parseIdParam(String(req.body.userId), "user id") : req.user.id;
  await assertCanAccessUser(req, userId);
  res.status(201).json(await attendanceService.applyCorrection(userId, req.body, req.user.id));
}

async function patchAttendanceCorrection(req, res) {
  const id = parseIdParam(req.params.id, "correction id");
  const row = await attendanceCorrectionsTable.findOne({ id }).lean();
  if (!row) notFound("Correction");
  await assertCanViewAttendanceForUser(req, row.userId);
  res.json(await attendanceService.reviewCorrection(id, req.body, req.user.id));
}

async function postAttendanceLateExcuse(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  const date = String(req.params.date ?? "").slice(0, 10);
  if (!date) badRequest("Valid date is required.");
  await assertCanAccessUser(req, userId);
  res.json(
    await attendanceService.excuseLateArrival(userId, date, { note: req.body.note }, req.user.id),
  );
}

async function patchAttendanceDailyOverride(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  const date = String(req.params.date ?? "").slice(0, 10);
  if (!date) badRequest("Valid date is required.");
  await assertCanAccessUser(req, userId);
  res.json(await attendanceService.adminOverrideAttendance(userId, date, req.body, req.user.id));
}

async function postEmployeeCredentials(req, res) {
  const userId = parseIdParam(req.params.id, "employee id");
  const resend = req.body?.resend === true;
  res.json(await employeesService.sendEmployeeLoginCredentials(userId, req.user, { resend }));
}

async function getDashboard(req, res) {
  res.json(await dashboardService.getHrmDashboard(req));
}

async function getSalaryStructures(_req, res) {
  res.json({ structures: await payrollService.listSalaryStructures() });
}

async function getOrgPayrollOverview(_req, res) {
  res.json(await payrollService.getOrgPayrollOverview());
}

async function putSalaryStructure(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  res.json(await payrollService.upsertSalaryStructure(userId, req.body));
}

async function getPayrollRuns(_req, res) {
  res.json({ runs: await payrollService.listPayrollRuns() });
}

async function postPayrollRun(req, res) {
  const year = Number(req.body.year);
  const month = Number(req.body.month);
  if (!year || !month) badRequest("year and month are required.");
  res.status(201).json(await payrollService.generatePayrollRun(year, month, req.user.id));
}

async function getPayrollRunLines(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  res.json({ lines: await payrollService.getPayrollRunLines(runId) });
}

async function getPayrollChecklistByPeriod(req, res) {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month) badRequest("year and month are required.");
  res.json(await payrollService.getPayrollPreRunChecklist(year, month));
}

async function getPayrollChecklist(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  const run = await payrollRunsTable.findOne({ id: runId }).lean();
  if (!run) notFound("Payroll run");
  res.json(await payrollService.getPayrollPreRunChecklist(run.year, run.month));
}

async function patchPayrollLine(req, res) {
  const lineId = parseIdParam(req.params.lineId, "payroll line id");
  res.json(await payrollService.updatePayrollLine(lineId, req.body));
}

async function postPayrollFinalize(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  res.json(await payrollService.finalizePayrollRun(runId, req.user.id));
}

async function postPayrollRevert(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  res.json(await payrollService.revertPayrollRun(runId, req.user.id));
}

async function postPayrollRegeneratePayslips(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  res.json(await payrollService.regeneratePayslipsForRun(runId));
}

async function postPayrollPaid(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  res.json(await payrollService.markPayrollRunPaid(runId, req.user.id));
}

async function postPayrollReview(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  res.json(await payrollService.markPayrollRunReviewed(runId, req.user.id));
}

async function getPayrollExport(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  const csv = await payrollService.exportPayrollCsv(runId);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="payroll-${runId}.csv"`);
  res.send(csv);
}

async function getPayrollBankExport(req, res) {
  const runId = parseIdParam(req.params.id, "payroll run id");
  const csv = await payrollService.exportPayrollBankTransferCsv(runId);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="payroll-bank-${runId}.csv"`);
  res.send(csv);
}

async function getMyPayslips(req, res) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  res.json({ slips: await payrollService.listMyPayslips(req.user.id, year) });
}

async function getAdminPayslips(req, res) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const allPeriods = req.query.allPeriods === "true" || req.query.allPeriods === "1";
  res.json({
    slips: await payrollService.listAdminPayslips({ year, month, allPeriods }),
  });
}

async function getPayslipById(req, res) {
  const id = parseIdParam(req.params.id, "payslip id");
  const slip = await payrollSlipsTable.findOne({ id }, { userId: 1 }).lean();
  if (!slip) notFound("Payslip");
  await assertCanAccessUser(req, slip.userId);
  const canViewUnpublished =
    isHrmAdminRole(req.user.role) ||
    (await userHasPermission(req.user.id, "hrm_payroll", "view"));
  res.json(
    await payrollService.getPayslipDetail(id, slip.userId, {
      requirePublished: !canViewUnpublished,
    }),
  );
}

async function getManualPayslips(req, res) {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const allPeriods = req.query.allPeriods === "true" || req.query.allPeriods === "1";
  res.json({
    slips: await manualPayslipService.listManualPayslips({ year, month, userId, allPeriods }),
  });
}

async function postManualPayslip(req, res) {
  res.status(201).json(await manualPayslipService.upsertManualPayslip(req.body, req.user.id));
}

async function getManualPayslipById(req, res) {
  const id = parseIdParam(req.params.id, "manual payslip id");
  res.json(await manualPayslipService.getManualPayslipDetail(id));
}

async function deleteManualPayslipById(req, res) {
  const id = parseIdParam(req.params.id, "manual payslip id");
  res.json(await manualPayslipService.deleteManualPayslip(id, req.user.id));
}

async function getCandidates(_req, res) {
  res.json({ candidates: await recruitmentService.listCandidates() });
}

async function postCandidate(req, res) {
  res.status(201).json(await recruitmentService.createCandidate(req.body));
}

async function patchCandidate(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  res.json(await recruitmentService.updateCandidate(id, req.body));
}

async function deleteCandidate(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  res.json(await recruitmentService.deleteCandidate(id));
}

async function postCreateEmployeeFromCandidate(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  const result = await recruitmentService.createEmployeeFromCandidate(id, req.body ?? {}, req.user);
  res.status(result.alreadyExisted ? 200 : 201).json(result);
}

async function postOnboarding(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  const record = await recruitmentService.startOnboarding(id, req.user.id);
  res.status(201).json({ record });
}

async function getOnboardingTasks(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  const record = await onboardingService.getOnboardingByCandidateId(id);
  res.json({ record, tasks: record?.tasks ?? [] });
}

async function getOnboardingList(req, res) {
  const status = req.query.status ?? undefined;
  res.json({ records: await onboardingService.listOnboardingRecords({ status }) });
}

async function getOnboardingEligibleEmployees(req, res) {
  res.json({ employees: await employeesService.listOnboardingEligibleEmployees() });
}

async function postOnboardingRecord(req, res) {
  const record = await onboardingService.createOnboardingRecord(req.body, req.user.id);
  res.status(201).json({ record });
}

async function getOnboardingRecord(req, res) {
  const id = parseIdParam(req.params.id, "onboarding id");
  res.json({ record: await onboardingService.getOnboardingRecord(id) });
}

async function patchOnboardingRecord(req, res) {
  const id = parseIdParam(req.params.id, "onboarding id");
  res.json({ record: await onboardingService.updateOnboardingRecord(id, req.body, req.user.id) });
}

async function patchOnboardingTaskToggle(req, res) {
  const id = parseIdParam(req.params.id, "onboarding id");
  const taskIndex = parseIdParam(req.params.taskIndex, "task index");
  res.json({
    record: await onboardingService.toggleOnboardingTask(id, taskIndex, req.user.id),
  });
}

async function deleteOnboardingRecord(req, res) {
  const id = parseIdParam(req.params.id, "onboarding id");
  res.json(await onboardingService.deleteOnboardingRecord(id, req.user.id));
}

async function patchOnboardingTask(req, res) {
  badRequest("Use PATCH /hrm/onboarding/:id/tasks/:taskIndex");
}

async function getDocuments(req, res) {
  const canViewAll =
    req.user.role === "super_admin" ||
    (await userHasPermission(req.user.id, "hrm_documents", "view"));

  let userId;
  if (req.query.userId != null) {
    userId = parseIdParam(String(req.query.userId), "user id");
    await assertCanAccessUser(req, userId);
  } else if (!canViewAll) {
    userId = req.user.id;
  }

  res.json({ documents: await documentsService.listDocuments(userId) });
}

async function postDocument(req, res) {
  const userId = req.body.userId != null ? parseIdParam(String(req.body.userId), "user id") : req.user.id;
  await assertCanAccessUser(req, userId);
  const doc = await documentsService.createDocument(userId, req.body);
  await logHrmAudit({
    actorId: req.user.id,
    action: "document_uploaded",
    entityType: "employee_document",
    entityId: doc.id,
    severity: "info",
    metadata: { userId, name: doc.name, category: doc.category },
    ipAddress: req.ip ?? null,
  });
  res.status(201).json(doc);
}

async function patchDocument(req, res) {
  const id = parseIdParam(req.params.id, "document id");
  const doc = await documentsService.reviewDocument(id, req.body, req.user.id);
  await logHrmAudit({
    actorId: req.user.id,
    action: req.body.status === "approved" ? "document_approved" : "document_rejected",
    entityType: "employee_document",
    entityId: id,
    severity: "info",
    metadata: { userId: doc.userId, status: doc.status },
    ipAddress: req.ip ?? null,
  });
  res.json(doc);
}

async function deleteDocument(req, res) {
  const id = parseIdParam(req.params.id, "document id");
  const row = await employeeDocumentsTable.findOne({ id }, { userId: 1, name: 1 }).lean();
  if (!row) notFound("Document");
  await assertCanAccessUser(req, row.userId);
  const canDeleteAny =
    isHrmAdminRole(req.user.role) ||
    (await userHasPermission(req.user.id, "hrm_documents", "edit")) ||
    (await userHasPermission(req.user.id, "hrm_documents", "delete"));
  if (row.userId !== req.user.id && !canDeleteAny) {
    forbidden("You cannot delete this document.");
  }
  await documentsService.deleteDocument(id);
  await logHrmAudit({
    actorId: req.user.id,
    action: "document_deleted",
    entityType: "employee_document",
    entityId: id,
    severity: "warning",
    metadata: { userId: row.userId, name: row.name },
    ipAddress: req.ip ?? null,
  });
  res.status(204).send();
}

async function getPolicies(_req, res) {
  res.json({ policies: await policiesService.listPolicies() });
}

async function postPolicy(req, res) {
  res.status(201).json(await policiesService.createPolicy(req.body));
}

async function patchPolicy(req, res) {
  const id = parseIdParam(req.params.id, "policy id");
  res.json(await policiesService.updatePolicy(id, req.body));
}

async function deletePolicy(req, res) {
  const id = parseIdParam(req.params.id, "policy id");
  await policiesService.deletePolicy(id);
  res.status(204).send();
}

async function postPolicyAck(req, res) {
  const policyId = parseIdParam(req.params.id, "policy id");
  res.status(201).json(await policiesService.acknowledgePolicy(req.user.id, policyId));
}

async function getMyPolicyAcks(req, res) {
  res.json({ acknowledgements: await policiesService.listAcknowledgements(req.user.id) });
}

async function getHrmSettings(_req, res) {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
}

async function patchHrmSettings(req, res) {
  const settings = await getOrCreateSettings();
  const fields = [
    "hrmLeaveYearStartMonth",
    "hrmDefaultShiftTemplateId",
    "hrmAttendanceShortfallThresholdMinutes",
    "hrmWeekendDays",
    "hrmGlobalWfhMode",
    "hrmPaidLeavesPerMonth",
    "hrmLeaveResetCycleMonths",
    "hrmMaxFreeLates",
    "hrmLatePenaltyAmount",
    "hrmElectronOnlyClock",
    "hrmLeaveCarryForwardStartYear",
  ];
  const update = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) update[f] = req.body[f];
  }
  if (req.body.hrmOnboardingChecklistTemplate !== undefined) {
    if (!Array.isArray(req.body.hrmOnboardingChecklistTemplate)) {
      badRequest("hrmOnboardingChecklistTemplate must be an array of task titles.");
    }
    update.hrmOnboardingChecklistTemplate = req.body.hrmOnboardingChecklistTemplate
      .map((t) => String(t).trim())
      .filter(Boolean);
  }
  const updated = await companySettingsTable.findOneAndUpdate(
    { id: settings.id },
    { $set: update },
    { new: true },
  );
  invalidateSettingsCache();

  if (
    req.body.hrmGlobalWfhMode !== undefined &&
    req.body.hrmGlobalWfhMode !== settings.hrmGlobalWfhMode
  ) {
    const enabled = req.body.hrmGlobalWfhMode === true;
    const actorName = req.user.name ?? "HR";
    const staff = await usersTable
      .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1 })
      .lean();
    for (const member of staff) {
      if (member.id === req.user.id) continue;
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId: member.id,
        type: "hrm_global_wfh",
        title: enabled ? "Company-wide WFH enabled" : "Company-wide WFH disabled",
        body: enabled
          ? `${actorName} enabled company-wide WFH. Clock in from anywhere — no late penalties.`
          : `${actorName} disabled company-wide WFH. Normal attendance rules apply.`,
        isRead: false,
      });
      notifyUser(member.id, "notification", { type: "hrm_global_wfh" });
    }
    broadcast("hrm_settings_updated", { hrmGlobalWfhMode: enabled });
  }

  if (Object.keys(update).length) {
    await logHrmAudit({
      actorId: req.user.id,
      action: "hrm_settings_updated",
      entityType: "company_settings",
      entityId: settings.id,
      severity: "info",
      metadata: { fields: Object.keys(update) },
    });
  }
  res.json(formatSettings(updated));
}

async function getHrmEmployees(req, res) {
  const scopeUserIds = await resolveHrmEmployeeScope(req);
  const pagination = parsePagination(req.query);
  const departmentId = req.query.departmentId != null
    ? parseIdParam(String(req.query.departmentId), "department id")
    : undefined;
  res.json(await employeesService.listHrmEmployees({
    search: req.query.search,
    departmentId,
    status: req.query.status ?? undefined,
    scopeUserIds: scopeUserIds ?? undefined,
    pagination,
  }));
}

async function getHrmEmployee(req, res) {
  const userId = parseIdParam(req.params.id, "employee id");
  await assertCanAccessUser(req, userId);
  res.json(await employeesService.getHrmEmployeeDetail(userId));
}

async function patchUserHrmProfile(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  await assertCanAccessUser(req, userId);
  const update = buildUserProfilePatchSet(req.body);
  if (!Object.keys(update).length) {
    badRequest("No profile fields to update.");
  }
  const mongoUpdate = buildProfilePatchMongoUpdate(update);
  const { usersTable } = await import("../models/schema/index.js");
  const before = await usersTable.findOne({ id: userId }).lean();
  if (!before) notFound("User");
  const user = await usersTable.findOneAndUpdate({ id: userId }, mongoUpdate, { new: true, runValidators: true });
  if (!user) notFound("User");
  if (Object.prototype.hasOwnProperty.call(update, "shiftId") && update.shiftId == null) {
    await shiftsService.clearShiftForUser(userId);
  }
  evictUserFromAuthCache(userId);
  await logHrmAudit({
    actorId: req.user.id,
    action: "employee_profile_updated",
    entityType: "user",
    entityId: userId,
    severity: "info",
    metadata: { fields: Object.keys(update) },
    ipAddress: req.ip ?? null,
  });
  const docFields = ["resumeUrl", "idProofUrl", "addressProofUrl", "certificateUrls", "profileDocuments"];
  if (Object.keys(update).some((f) => docFields.includes(f))) {
    await logHrmAudit({
      actorId: req.user.id,
      action: "profile_document_updated",
      entityType: "user",
      entityId: userId,
      severity: "info",
      metadata: { fields: Object.keys(update).filter((f) => docFields.includes(f)) },
      ipAddress: req.ip ?? null,
    });
  }
  if (leaveProfileFieldsTouched(Object.keys(update))) {
    await ensureUserLeaveAccrualForPeriod(userId);
  }
  const detail = await employeesService.getHrmEmployeeDetail(userId);
  res.json({ message: "HRM profile updated", employee: detail.employee });
}

async function getAssets(req, res) {
  res.json({
    assets: await assetsService.listAssets({
      status: req.query.status,
      category: req.query.category,
      assignedUserId: req.query.assignedUserId,
      search: req.query.search,
    }),
  });
}

async function getAsset(req, res) {
  const id = parseIdParam(req.params.id, "asset id");
  res.json({ asset: await assetsService.getAsset(id) });
}

async function postAsset(req, res) {
  const asset = await assetsService.createAsset(req.body, req.user.id);
  res.status(201).json(asset);
}

async function patchAsset(req, res) {
  const id = parseIdParam(req.params.id, "asset id");
  res.json(await assetsService.updateAsset(id, req.body, req.user.id));
}

async function deleteAsset(req, res) {
  const id = parseIdParam(req.params.id, "asset id");
  res.json(await assetsService.deleteAsset(id, req.user.id));
}

async function getExitRequests(req, res) {
  res.json({
    requests: await exitService.listExitRequests({
      status: req.query.status,
      approvalStatus: req.query.approvalStatus,
    }),
  });
}

async function getExitRequest(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json({ request: await exitService.getExitRequest(id) });
}

async function postExitRequest(req, res) {
  const request = await exitService.createExitRequest(req.body, req.user.id);
  res.status(201).json(request);
}

async function patchExitRequest(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json(await exitService.updateExitRequest(id, req.body, req.user.id));
}

async function postExitAdvance(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json(await exitService.advanceExitStage(id, req.user.id));
}

async function postExitReturnAssets(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json(await exitService.returnExitAssets(id, req.user.id));
}

async function postExitCancel(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json(await exitService.cancelExitRequest(id, req.user.id));
}

async function postExitApprove(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json(await exitService.approveExitRequest(id, req.body, req.user.id));
}

async function postExitReject(req, res) {
  const id = parseIdParam(req.params.id, "exit id");
  res.json(await exitService.rejectExitRequest(id, req.body, req.user.id));
}

async function getExperienceLetters(req, res) {
  res.json({
    letters: await lettersService.listExperienceLetters({
      search: req.query.search,
      limit: req.query.limit,
    }),
  });
}

async function postExperienceLetterPreview(req, res) {
  const userId = parseIdParam(req.body.userId, "employee id");
  const { relievingDate, joiningDate, offeredCtc, letterType, additionalNotes } = req.body ?? {};
  res.json(
    await lettersService.previewExperienceLetter({
      userId,
      relievingDate,
      joiningDate,
      offeredCtc,
      letterType,
      additionalNotes,
    }),
  );
}

async function postExperienceLetter(req, res) {
  const userId = parseIdParam(req.body.userId, "employee id");
  const { relievingDate, joiningDate, offeredCtc, letterType, additionalNotes } = req.body ?? {};
  const letter = await lettersService.createExperienceLetter(req.user, {
    userId,
    relievingDate,
    joiningDate,
    offeredCtc,
    letterType,
    additionalNotes,
  });
  res.status(201).json(letter);
}

async function getExperienceLetter(req, res) {
  const id = parseIdParam(req.params.id, "letter id");
  res.json(await lettersService.getExperienceLetter(id));
}

async function getExperienceLetterPdf(req, res) {
  const id = parseIdParam(req.params.id, "letter id");
  const letter = await lettersService.getExperienceLetter(id);
  const pdfPath = await lettersService.getExperienceLetterPdfPath(id);
  if (pdfPath && typeof pdfPath === "object" && pdfPath.remoteUrl) {
    return res.redirect(pdfPath.remoteUrl);
  }
  const fileName = `${letter.letterType}_letter_${letter.employeeCode}.pdf`;
  res.download(pdfPath, fileName);
}

async function postExperienceLetterSend(req, res) {
  const id = parseIdParam(req.params.id, "letter id");
  res.json(await lettersService.sendExperienceLetter(req.user, id));
}

async function deleteExperienceLetter(req, res) {
  const id = parseIdParam(req.params.id, "letter id");
  res.json(await lettersService.deleteExperienceLetter(req.user, id));
}

async function getAuditLogs(req, res) {
  const query = {};
  if (req.query.severity) query.severity = req.query.severity;
  if (req.query.action) {
    const term = String(req.query.action).trim();
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.action = { $regex: escaped, $options: "i" };
    }
  }
  const logs = await hrmAuditLogsTable.find(query).sort({ createdAt: -1 }).limit(200).lean();
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))];
  const { usersTable } = await import("../models/schema/index.js");
  const actors = actorIds.length
    ? await usersTable.find({ id: { $in: actorIds } }, { id: 1, name: 1, email: 1 }).lean()
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));
  res.json({
    logs: logs.map((l) => ({
      ...l,
      actorName: actorById.get(l.actorId)?.name ?? null,
      actorEmail: actorById.get(l.actorId)?.email ?? null,
      createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
    })),
  });
}

export {
  getDepartments,
  postDepartment,
  patchDepartment,
  deleteDepartment,
  getLeaveTypes,
  getLeaveBalances,
  getLeaveRequests,
  postLeaveRequest,
  patchLeaveRequest,
  cancelLeaveRequest,
  getWfhRequests,
  postWfhRequest,
  patchWfhRequest,
  cancelWfhRequest,
  getShiftTemplates,
  postShiftTemplate,
  patchShiftTemplate,
  getShiftAssignments,
  postShiftAssignment,
  getHolidays,
  postHoliday,
  patchHoliday,
  deleteHoliday,
  getCalendar,
  postGenerateSundayHolidays,
  getAttendanceDaily,
  getAttendanceVariance,
  getAttendanceCorrections,
  postAttendanceCorrection,
  patchAttendanceCorrection,
  postAttendanceLateExcuse,
  patchAttendanceDailyOverride,
  postEmployeeCredentials,
  getDashboard,
  getHrmEmployees,
  getHrmEmployee,
  getSalaryStructures,
  getOrgPayrollOverview,
  putSalaryStructure,
  getPayrollRuns,
  postPayrollRun,
  postPayrollReview,
  getPayrollRunLines,
  getPayrollChecklist,
  getPayrollChecklistByPeriod,
  patchPayrollLine,
  postPayrollFinalize,
  postPayrollRevert,
  postPayrollRegeneratePayslips,
  postPayrollPaid,
  getPayrollExport,
  getPayrollBankExport,
  getMyPayslips,
  getAdminPayslips,
  getPayslipById,
  getManualPayslips,
  postManualPayslip,
  getManualPayslipById,
  deleteManualPayslipById,
  getCandidates,
  postCandidate,
  patchCandidate,
  deleteCandidate,
  postCreateEmployeeFromCandidate,
  postOnboarding,
  getOnboardingTasks,
  patchOnboardingTask,
  getOnboardingList,
  getOnboardingEligibleEmployees,
  postOnboardingRecord,
  getOnboardingRecord,
  patchOnboardingRecord,
  patchOnboardingTaskToggle,
  deleteOnboardingRecord,
  getDocuments,
  postDocument,
  patchDocument,
  deleteDocument,
  getPolicies,
  postPolicy,
  patchPolicy,
  deletePolicy,
  postPolicyAck,
  getMyPolicyAcks,
  getHrmSettings,
  patchHrmSettings,
  patchUserHrmProfile,
  getAssets,
  getAsset,
  postAsset,
  patchAsset,
  deleteAsset,
  getExitRequests,
  getExitRequest,
  postExitRequest,
  patchExitRequest,
  postExitAdvance,
  postExitReturnAssets,
  postExitCancel,
  postExitApprove,
  postExitReject,
  getExperienceLetters,
  postExperienceLetterPreview,
  postExperienceLetter,
  getExperienceLetter,
  getExperienceLetterPdf,
  postExperienceLetterSend,
  deleteExperienceLetter,
  getAuditLogs,
};
