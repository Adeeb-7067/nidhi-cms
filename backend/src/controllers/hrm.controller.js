import { hrmAuditLogsTable, payrollSlipsTable, payrollRunsTable, leaveRequestsTable, wfhRequestsTable, attendanceCorrectionsTable } from "../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination } from "../utils/route-errors.js";
import * as departmentsService from "../services/hrm/departments.service.js";
import * as leaveService from "../services/hrm/leave.service.js";
import * as wfhService from "../services/hrm/wfh.service.js";
import * as shiftsService from "../services/hrm/shifts.service.js";
import * as holidaysService from "../services/hrm/holidays.service.js";
import * as calendarService from "../services/hrm/calendar.service.js";
import * as attendanceService from "../services/hrm/attendance.service.js";
import * as payrollService from "../services/hrm/payroll.service.js";
import * as recruitmentService from "../services/hrm/recruitment.service.js";
import * as documentsService from "../services/hrm/documents.service.js";
import * as policiesService from "../services/hrm/policies.service.js";
import { resolveScopedUserIds, resolveAttendanceScopedUserIds, assertCanAccessUser, assertCanViewAttendanceForUser, resolveHrmEmployeeScope } from "../services/hrm/team-scope.js";
import {
  getOrCreateSettings,
  formatSettings,
  invalidateSettingsCache,
} from "../services/company-settings.js";
import { companySettingsTable } from "../models/schema/index.js";
import { evictUserFromAuthCache } from "../middlewares/auth.js";
import { logHrmAudit } from "../services/hrm/hrm-audit.service.js";
import { userHasPermission } from "../services/permissions.service.js";
import { buildUserProfilePatchSet } from "../utils/user-profile-fields.js";
import * as employeesService from "../services/hrm/employees.service.js";
import * as dashboardService from "../services/hrm/dashboard.service.js";

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
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  res.json({ balances: await leaveService.listLeaveBalances(userId, year) });
}

async function getLeaveRequests(req, res) {
  const userIds = await resolveScopedUserIds(req, req.query.userId);
  const status = req.query.status ?? undefined;
  const date = req.query.date ?? undefined;
  let requests = await leaveService.listLeaveRequests({ userIds: userIds ?? undefined, status });
  if (date) {
    requests = requests.filter(
      (r) => r.startDate <= date && r.endDate >= date,
    );
  }
  res.json({ requests });
}

async function postLeaveRequest(req, res) {
  const userId = req.body.userId != null ? parseIdParam(String(req.body.userId), "user id") : req.user.id;
  await assertCanAccessUser(req, userId);
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
  await assertCanAccessUser(req, row.userId);
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

async function getPayslipById(req, res) {
  const id = parseIdParam(req.params.id, "payslip id");
  const slip = await payrollSlipsTable.findOne({ id }, { userId: 1 }).lean();
  if (!slip) notFound("Payslip");
  await assertCanAccessUser(req, slip.userId);
  res.json(await payrollService.getPayslipDetail(id, slip.userId));
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

async function postOnboarding(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  res.status(201).json({ tasks: await recruitmentService.startOnboarding(id) });
}

async function getOnboardingTasks(req, res) {
  const id = parseIdParam(req.params.id, "candidate id");
  res.json({ tasks: await recruitmentService.listOnboardingTasks(id) });
}

async function patchOnboardingTask(req, res) {
  const id = parseIdParam(req.params.taskId, "onboarding task id");
  res.json(await recruitmentService.completeOnboardingTask(id));
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
  res.status(201).json(await documentsService.createDocument(userId, req.body));
}

async function patchDocument(req, res) {
  const id = parseIdParam(req.params.id, "document id");
  res.json(await documentsService.reviewDocument(id, req.body, req.user.id));
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
    "hrmMaxFreeLates",
    "hrmElectronOnlyClock",
    "hrmLeaveCarryForwardStartYear",
  ];
  const update = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) update[f] = req.body[f];
  }
  const updated = await companySettingsTable.findOneAndUpdate(
    { id: settings.id },
    { $set: update },
    { new: true },
  );
  invalidateSettingsCache();
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
  const { usersTable } = await import("../models/schema/index.js");
  const before = await usersTable.findOne({ id: userId }).lean();
  if (!before) notFound("User");
  const user = await usersTable.findOneAndUpdate({ id: userId }, { $set: update }, { new: true });
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
  const detail = await employeesService.getHrmEmployeeDetail(userId);
  res.json({ message: "HRM profile updated", employee: detail.employee });
}

async function getAuditLogs(req, res) {
  const query = {};
  if (req.query.severity) query.severity = req.query.severity;
  if (req.query.action) query.action = req.query.action;
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
  putSalaryStructure,
  getPayrollRuns,
  postPayrollRun,
  postPayrollReview,
  getPayrollRunLines,
  getPayrollChecklist,
  getPayrollChecklistByPeriod,
  patchPayrollLine,
  postPayrollFinalize,
  postPayrollPaid,
  getPayrollExport,
  getPayrollBankExport,
  getMyPayslips,
  getPayslipById,
  getCandidates,
  postCandidate,
  patchCandidate,
  postOnboarding,
  getOnboardingTasks,
  patchOnboardingTask,
  getDocuments,
  postDocument,
  patchDocument,
  getPolicies,
  postPolicy,
  patchPolicy,
  deletePolicy,
  postPolicyAck,
  getMyPolicyAcks,
  getHrmSettings,
  patchHrmSettings,
  patchUserHrmProfile,
  getAuditLogs,
};
