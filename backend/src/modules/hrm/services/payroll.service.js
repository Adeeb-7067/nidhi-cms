import {

  salaryStructuresTable,

  payrollRunsTable,

  payrollLinesTable,

  payrollSlipsTable,

  usersTable,

  getNextSequence,

  getNextSequenceRange,

} from "../../../models/schema/index.js";

import { dailyAttendanceTable } from "../schema/daily-attendance.js";

import { leaveRequestsTable } from "../schema/leave.js";

import { attendanceCorrectionsTable } from "../schema/attendance.js";

import { shiftAssignmentsTable } from "../schema/shifts.js";

import { HttpError } from "../../../lib/http-error.js";
import { conflict, notFound, badRequest } from "../../../utils/route-errors.js";

import { getAttendanceDailySummaries } from "./attendance.service.js";
import { getHrmPolicyContext } from "./hrm-date-utils.js";
import { companyHolidaysTable } from "../schema/holidays.js";

import { logHrmAudit } from "./hrm-audit.service.js";

import { getOrCreateSettings } from "../../settings/services/company-settings.js";

import { hrmEmployeeRoles } from "../../../constants/user-roles.js";

import { runInTx } from "../../../lib/db-tx.js";

import { encryptIntoFields, decryptFromFields, maskTail } from "../../../lib/hrm-crypto.js";

import {
  aggregateAttendanceForPayroll,
  buildLeavePayrollByDate,
  computePayrollLineAmounts,
  evaluatePayrollReadiness,
  resolveContractSalary,
} from "./payroll-compute.js";
import { generatePayslipHtmlFromCms, resolvePublicAssetUrl } from "./payslip-template.js";

const PAYROLL_LINE_EDITABLE = ["paidDays", "lopDays", "lateCount", "gross", "deductions", "lopDeduction", "notes"];

const BANK_ENCRYPT_FIELDS = ["bankAccountNumber", "ifscCode", "bankName", "panNumber"];



function monthBounds(year, month) {

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

  const endDay = new Date(year, month, 0).getDate();

  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  return { startDate, endDate };

}

function summarizeApprovedLeaveForPeriod(leaveRequests, startDate, endDate, weekendDays, holidayDates) {
  const leaveByDate = buildLeavePayrollByDate(leaveRequests ?? [], { startDate, endDate, weekendDays, holidayDates });
  let paidSum = 0;
  let lopSum = 0;
  for (const row of leaveByDate.values()) {
    paidSum += Number(row?.paid ?? 0);
    lopSum += Number(row?.lop ?? 0);
  }
  return {
    approvedLeaveDaysUsed: Math.round((paidSum + lopSum) * 100) / 100,
    unpaidLeaveDays: Math.round(lopSum * 100) / 100,
  };
}



function formatSalaryStructure(row, userMeta = {}) {

  const out = {

    ...row,

    employeeName: userMeta.name,

    employeeId: userMeta.employeeId,

    bankAccountMasked: maskTail(decryptFromFields("bankAccountNumber", row)),

    ifscMasked: maskTail(decryptFromFields("ifscCode", row), 4),

    panMasked: maskTail(decryptFromFields("panNumber", row), 4),

    bankNameMasked: maskTail(decryptFromFields("bankName", row)),

  };

  for (const field of BANK_ENCRYPT_FIELDS) {

    delete out[field];

    delete out[`${field}Iv`];

    delete out[`${field}AuthTag`];

  }

  return out;

}



function buildBankEncryptPatch(body) {

  const patch = {};

  for (const field of BANK_ENCRYPT_FIELDS) {

    if (body[field] !== undefined) {

      Object.assign(patch, encryptIntoFields(field, body[field]));

    }

  }

  return patch;

}



function stripBankFields(body) {

  const next = { ...body };

  for (const field of BANK_ENCRYPT_FIELDS) {

    delete next[field];

  }

  return next;

}



/** Create or refresh salary slip rows + Satyakabir HTML for every line in a payroll run. */
async function syncPayslipsForRun(runId, session = null) {
  const run = await payrollRunsTable.findOne({ id: runId }).lean();
  if (!run) return;
  const { startDate, endDate } = monthBounds(run.year, run.month);

  const lines = await payrollLinesTable.find({ payrollRunId: runId }).lean();
  if (!lines.length) return;

  const settings = await getOrCreateSettings();
  const weekendDays = settings.hrmWeekendDays?.length ? settings.hrmWeekendDays : [0, 6];
  const existing = await payrollSlipsTable
    .find({ payrollLineId: { $in: lines.map((l) => l.id) } })
    .lean();
  const slipByLineId = new Map(existing.map((s) => [s.payrollLineId, s]));
  const sessOpts = session ? { session } : {};

  // Bulk-load all users in one query — salary data lives on the user document.
  const lineUserIds = lines.map((l) => l.userId);
  const [bulkUsers, structureRows, approvedLeaveRequests, holidays] = await Promise.all([
    usersTable.find({ id: { $in: lineUserIds } }).lean(),
    salaryStructuresTable.find({ userId: { $in: lineUserIds } }).lean(),
    leaveRequestsTable.find({
      userId: { $in: lineUserIds },
      status: "approved",
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).lean(),
    companyHolidaysTable.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
  ]);
  const userMap = new Map(bulkUsers.map((u) => [u.id, u]));
  const structureByUser = new Map(structureRows.map((r) => [r.userId, r]));
  const holidayDates = new Set(holidays.map((h) => h.date));
  const leaveRequestsByUser = new Map();
  for (const request of approvedLeaveRequests) {
    const list = leaveRequestsByUser.get(request.userId) ?? [];
    list.push(request);
    leaveRequestsByUser.set(request.userId, list);
  }

  const linesToInsert = lines.filter((line) => !slipByLineId.has(line.id));
  const insertIds = linesToInsert.length
    ? await getNextSequenceRange("payroll_slips", linesToInsert.length)
    : [];
  const insertIdByLineId = new Map(linesToInsert.map((line, i) => [line.id, insertIds[i]]));

  const bulkOps = lines.map((line) => {
    const user = userMap.get(line.userId);
    const sal = user?.salary ?? {};
    const contract = resolveContractSalary({
      profileSalary: sal,
      structureRow: structureByUser.get(line.userId),
    });
    const structure = {
      basic: contract.basic,
      gross: contract.gross,
      allowances: contract.allowances,
      hra: contract.hra,
      contractNet: contract.contractNet,
    };
    const leaveSummary = summarizeApprovedLeaveForPeriod(
      leaveRequestsByUser.get(line.userId) ?? [],
      startDate,
      endDate,
      weekendDays,
      holidayDates,
    );
    const html = generatePayslipHtmlFromCms({ user, run, line, structure, settings, leaveSummary });
    const prior = slipByLineId.get(line.id);

    if (prior) {
      return {
        updateOne: {
          filter: { id: prior.id },
          update: { $set: { htmlContent: html, year: run.year, month: run.month, userId: line.userId } },
        },
      };
    }
    return {
      insertOne: {
        document: {
          id: insertIdByLineId.get(line.id),
          payrollLineId: line.id,
          userId: line.userId,
          year: run.year,
          month: run.month,
          htmlContent: html,
        },
      },
    };
  });

  if (bulkOps.length) {
    await payrollSlipsTable.bulkWrite(bulkOps, sessOpts);
  }
}

async function syncPayslipForLine(lineId) {
  const line = await payrollLinesTable.findOne({ id: lineId }).lean();
  if (!line) return;
  const run = await payrollRunsTable.findOne({ id: line.payrollRunId }).lean();
  if (!run || run.status === "finalized" || run.status === "paid") return;
  await syncPayslipsForRun(run.id);
}

async function staffMissingShiftAssignment(userIds, startDate, endDate) {

  if (!userIds.length) return [];

  const rangeStart = new Date(`${startDate}T12:00:00Z`);

  const rangeEnd = new Date(`${endDate}T12:00:00Z`);

  const assignments = await shiftAssignmentsTable.find({ userId: { $in: userIds } }).lean();

  const covered = new Set();

  for (const a of assignments) {

    const from = new Date(a.effectiveFrom);

    const to = a.effectiveTo ? new Date(a.effectiveTo) : rangeEnd;

    if (from <= rangeEnd && to >= rangeStart) {

      covered.add(a.userId);

    }

  }

  return userIds.filter((id) => !covered.has(id));

}



export async function getPayrollPreRunChecklist(year, month) {

  const { startDate, endDate } = monthBounds(year, month);

  const staff = await usersTable

    .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1, name: 1, employeeId: 1, salary: 1 })

    .lean();

  const staffIds = staff.map((u) => u.id);

  const userById = new Map(staff.map((u) => [u.id, u]));



  const pendingLeave = await leaveRequestsTable.find({

    status: "pending",

    startDate: { $lte: endDate },

    endDate: { $gte: startDate },

  }).lean();



  const pendingCorrections = await attendanceCorrectionsTable.find({

    status: "pending",

    date: { $gte: startDate, $lte: endDate },

  }).lean();



  const structureRows = await salaryStructuresTable
    .find({ userId: { $in: staffIds } })
    .lean();
  const structureByUser = new Map(structureRows.map((r) => [r.userId, r]));

  const missingStructure = staff.filter(
    (u) =>
      !resolveContractSalary({
        profileSalary: u.salary,
        structureRow: structureByUser.get(u.id),
      }).configured,
  );



  const missingShiftIds = await staffMissingShiftAssignment(staffIds, startDate, endDate);

  const missingShift = missingShiftIds.map((id) => userById.get(id)).filter(Boolean);



  const blockers = [];

  if (pendingLeave.length) {

    blockers.push({

      code: "pending_leave",

      message: "Pending leave requests overlap this pay period",

      count: pendingLeave.length,

      items: pendingLeave.slice(0, 20).map((r) => ({ id: r.id, userId: r.userId, startDate: r.startDate, endDate: r.endDate })),

    });

  }

  if (pendingCorrections.length) {

    blockers.push({

      code: "pending_corrections",

      message: "Pending attendance corrections in this pay period",

      count: pendingCorrections.length,

      items: pendingCorrections.slice(0, 20).map((r) => ({ id: r.id, userId: r.userId, date: r.date })),

    });

  }

  if (missingStructure.length) {

    blockers.push({

      code: "missing_salary_structure",

      message: "Active staff missing compensation (salary not configured)",

      count: missingStructure.length,

      items: missingStructure.slice(0, 20).map((u) => ({ userId: u.id, name: u.name, employeeId: u.employeeId })),

    });

  }

  if (missingShift.length) {

    blockers.push({

      code: "missing_shift",

      message: "Active staff with no shift assignment covering this period",

      count: missingShift.length,

      items: missingShift.slice(0, 20).map((u) => ({ userId: u.id, name: u.name, employeeId: u.employeeId })),

    });

  }



  const checklist = {

    year,

    month,

    startDate,

    endDate,

    blockers,

    warnings: [],

    ...evaluatePayrollReadiness({ blockers }),

  };



  return checklist;

}

function payrollBlockerConflict(checklist, action) {
  throw new HttpError(
    409,
    `Payroll pre-run checklist has blockers — resolve them before ${action}.`,
    { code: "CONFLICT", details: { checklist } },
  );
}

export async function listSalaryStructures() {

  const rows = await salaryStructuresTable.find().lean();

  const users = await usersTable.find({ id: { $in: rows.map((r) => r.userId) } }, { id: 1, name: 1, employeeId: 1 }).lean();

  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => formatSalaryStructure(r, userMap.get(r.userId)));

}

/** Org-wide payroll KPIs — uses team profile salary first, then structure table (same as payroll run). */
export async function getOrgPayrollOverview() {
  const staff = await usersTable
    .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1, salary: 1 })
    .lean();
  const staffIds = staff.map((u) => u.id);
  const structureRows = staffIds.length
    ? await salaryStructuresTable.find({ userId: { $in: staffIds } }).lean()
    : [];
  const structureByUser = new Map(structureRows.map((r) => [r.userId, r]));

  let configuredCount = 0;
  let monthlyCommitmentNet = 0;

  for (const user of staff) {
    const contract = resolveContractSalary({
      profileSalary: user.salary,
      structureRow: structureByUser.get(user.id),
    });
    if (!contract.configured) continue;
    configuredCount += 1;
    monthlyCommitmentNet += contract.contractNet;
  }

  const totalActive = staff.length;
  const avgNetSalary = configuredCount > 0 ? monthlyCommitmentNet / configuredCount : 0;

  return {
    totalActive,
    configuredCount,
    notConfiguredCount: Math.max(0, totalActive - configuredCount),
    monthlyCommitmentNet: Math.round(monthlyCommitmentNet * 100) / 100,
    avgNetSalary: Math.round(avgNetSalary * 100) / 100,
  };
}



export async function getSalaryStructureForUser(userId) {

  const row = await salaryStructuresTable.findOne({ userId }).lean();

  if (!row) return null;

  const user = await usersTable.findOne({ id: userId }, { id: 1, name: 1, employeeId: 1 }).lean();

  return formatSalaryStructure(row, user);

}



/** Mirror team profile salary into salaryStructures for legacy readers (dashboard, exports). */
export async function syncSalaryStructureFromProfile(userId) {
  const user = await usersTable.findOne({ id: userId }, { salary: 1 }).lean();
  const sal = user?.salary;
  const basic = Number(sal?.basicSalary) || 0;
  if (basic <= 0) return null;

  const allowances = Number(sal?.allowances) || 0;
  const deductions = Number(sal?.deductions) || 0;
  const gross = Math.round((basic + allowances) * 100) / 100;
  const net =
    Number(sal?.netSalary) > 0
      ? Number(sal.netSalary)
      : Math.max(0, Math.round((gross - deductions) * 100) / 100);
  const statutory = Math.max(0, Math.round((gross - net) * 100) / 100);

  return upsertSalaryStructure(userId, {
    basic,
    hra: 0,
    allowances,
    pfEmployee: statutory,
    tds: 0,
    esiEmployee: 0,
  });
}



export async function upsertSalaryStructure(userId, body) {

  const numericBody = stripBankFields(body);

  const gross = (numericBody.basic ?? 0) + (numericBody.hra ?? 0) + (numericBody.allowances ?? 0);

  const net = gross - (numericBody.pfEmployee ?? 0) - (numericBody.esiEmployee ?? 0) - (numericBody.tds ?? 0);

  const bankPatch = buildBankEncryptPatch(body);

  const payload = { ...numericBody, ...bankPatch, gross, net };



  const existing = await salaryStructuresTable.findOne({ userId });

  if (existing) {

    const updated = await salaryStructuresTable.findOneAndUpdate(

      { userId },

      { $set: payload },

      { new: true },

    );

    const user = await usersTable.findOne({ id: userId }, { id: 1, name: 1, employeeId: 1 }).lean();

    return formatSalaryStructure(updated.toObject(), user);

  }



  const id = await getNextSequence("salary_structures");

  const created = await salaryStructuresTable.create({ id, userId, ...payload });

  const user = await usersTable.findOne({ id: userId }, { id: 1, name: 1, employeeId: 1 }).lean();

  return formatSalaryStructure(created.toObject(), user);

}



export async function generatePayrollRun(year, month, actorId) {

  if (!year || !month || month < 1 || month > 12) badRequest("Valid year and month are required.");



  const checklist = await getPayrollPreRunChecklist(year, month);

  if (!checklist.ready) {
    payrollBlockerConflict(checklist, "generating");
  }



  let run = await payrollRunsTable.findOne({ year, month });

  if (run && run.status !== "draft") {

    conflict(`Payroll for ${month}/${year} is ${run.status} and cannot be regenerated.`);

  }



  if (!run) {

    const id = await getNextSequence("payroll_runs");

    run = await payrollRunsTable.create({ id, year, month, status: "draft" });

  }



  const oldLines = await payrollLinesTable.find({ payrollRunId: run.id }, { id: 1 }).lean();
  if (oldLines.length) {
    await payrollSlipsTable.deleteMany({ payrollLineId: { $in: oldLines.map((l) => l.id) } });
  }

  await payrollLinesTable.deleteMany({ payrollRunId: run.id });



  const { startDate, endDate } = monthBounds(year, month);

  const staff = await usersTable.find({ role: { $in: hrmEmployeeRoles }, status: "active" }).lean();

  // Cap attendance to today so future dates don't produce computed "weekend" summaries.
  const today = new Date().toISOString().slice(0, 10);
  const attendanceEndDate = endDate <= today ? endDate : today;
  const { summaries } = await getAttendanceDailySummaries({ startDate, endDate: attendanceEndDate });

  const { weekendDays, maxFreeLates, latePenaltyAmount } = await getHrmPolicyContext();
  const holidays = await companyHolidaysTable
    .find({ date: { $gte: startDate, $lte: endDate } })
    .lean();
  const holidayDates = new Set(holidays.map((h) => h.date));

  const staffIds = staff.map((u) => u.id);

  const structureRows = await salaryStructuresTable.find({ userId: { $in: staffIds } }).lean();
  const structureByUser = new Map(structureRows.map((r) => [r.userId, r]));

  const approvedLeaves = await leaveRequestsTable
    .find({
      userId: { $in: staffIds },
      status: "approved",
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    })
    .lean();
  const leavesByUserId = new Map();
  for (const req of approvedLeaves) {
    const list = leavesByUserId.get(req.userId) ?? [];
    list.push(req);
    leavesByUserId.set(req.userId, list);
  }

  for (const user of staff) {

    const userSummaries = summaries.filter((s) => s.userId === user.id);

    const leavePayrollByDate = buildLeavePayrollByDate(leavesByUserId.get(user.id) ?? [], {
      startDate,
      endDate: attendanceEndDate,
      weekendDays,
      holidayDates,
    });

    const counts = aggregateAttendanceForPayroll(userSummaries, {
      startDate,
      endDate,
      leavePayrollByDate,
      maxFreeLates,
    });

    const contract = resolveContractSalary({
      profileSalary: user.salary,
      structureRow: structureByUser.get(user.id),
    });

    const amounts = computePayrollLineAmounts({

      gross: contract.payrollBase,

      ...counts,

      latePenaltyPerDay: latePenaltyAmount,

      pfEmployee: 0,

      esiEmployee: 0,

      tds: 0,

    });

    const hasPayrollActivity = (amounts.paidDays ?? 0) > 0 || (amounts.lopDays ?? 0) > 0;
    if (!hasPayrollActivity) {
      continue;
    }

    const lineId = await getNextSequence("payroll_lines");

    await payrollLinesTable.create({

      id: lineId,

      payrollRunId: run.id,

      userId: user.id,

      ...amounts,

      pfEmployer: 0,

    });

  }



  await syncPayslipsForRun(run.id);

  await logHrmAudit({

    actorId,

    action: "payroll_generated",

    entityType: "payroll_run",

    entityId: run.id,

    severity: "critical",

    metadata: { year, month },

  });



  return run;

}



export async function markPayrollRunReviewed(runId, actorId) {

  const run = await payrollRunsTable.findOne({ id: runId });

  if (!run) notFound("Payroll run");

  if (run.status !== "draft") conflict("Only draft runs can be marked reviewed.");

  return payrollRunsTable.findOneAndUpdate(

    { id: runId },

    { $set: { status: "reviewed", reviewedAt: new Date(), reviewedBy: actorId } },

    { new: true },

  );

}



export async function finalizePayrollRun(runId, actorId) {

  const run = await payrollRunsTable.findOne({ id: runId });

  if (!run) notFound("Payroll run");

  if (run.status === "finalized" || run.status === "paid") conflict("Already finalized.");



  const checklist = await getPayrollPreRunChecklist(run.year, run.month);

  if (!checklist.ready) {
    payrollBlockerConflict(checklist, "finalizing");
  }



  const lines = await payrollLinesTable.find({ payrollRunId: runId }).lean();

  if (!lines.length) badRequest("No payroll lines — generate payroll first.");



  const settings = await getOrCreateSettings();

  const { startDate, endDate } = monthBounds(run.year, run.month);

  const updated = await runInTx(async (session) => {
    const sessOpts = session ? { session } : {};

    await syncPayslipsForRun(runId, session);

    await dailyAttendanceTable.updateMany(

      { date: { $gte: startDate, $lte: endDate } },

      { $set: { lockedForPayroll: true } },

      sessOpts,

    );
  


    let query = payrollRunsTable.findOneAndUpdate(

      { id: runId, status: { $in: ["draft", "reviewed"] } },

      { $set: { status: "finalized", finalizedAt: new Date(), finalizedBy: actorId } },

      { new: true },

    );

    if (session) query = query.session(session);

    const row = await query;

    if (!row) conflict("Payroll run could not be finalized.");

    return row;

  });



  await logHrmAudit({

    actorId,

    action: "payroll_finalized",

    entityType: "payroll_run",
 
    entityId: runId,

    severity: "critical",

    metadata: { year: run.year, month: run.month, attendanceLocked: true },

  });



  return updated;

}



export async function markPayrollRunPaid(runId, actorId) {
  const run = await payrollRunsTable.findOne({ id: runId });
  if (!run) notFound("Payroll run");
  if (run.status !== "finalized") conflict("Only finalized payroll can be marked paid.");

  const { runInTx } = await import("../../../lib/db-tx.js");
  const { settlePayrollRun } = await import("../../finance/services/cash-bridges.service.js");

  let updated;
  await runInTx(async (session) => {
    const locked = await payrollRunsTable
      .findOneAndUpdate(
        { id: runId, status: "finalized" },
        { $set: { status: "paid" } },
        session ? { new: true, session } : { new: true },
      )
      .lean();
    if (!locked) conflict("Payroll run could not be marked paid.");

    const lines = await payrollLinesTable.find({ payrollRunId: runId }).session(session).lean();
    const cash = await settlePayrollRun(session, {
      run: locked,
      lines,
      recordedBy: actorId,
    });

    if (cash.paymentId) {
      updated = await payrollRunsTable
        .findOneAndUpdate(
          { id: runId },
          { $set: { financePaymentId: cash.paymentId, financeExpenseId: cash.expenseId ?? null } },
          session ? { new: true, session } : { new: true },
        )
        .lean();
    } else {
      updated = locked;
    }
  });

  await logHrmAudit({
    actorId,
    action: "payroll_paid",
    entityType: "payroll_run",
    entityId: runId,
    severity: "critical",
    metadata: { year: run.year, month: run.month },
  });

  return updated;
}



export async function revertPayrollRun(runId, actorId) {
  const run = await payrollRunsTable.findOne({ id: runId });
  if (!run) notFound("Payroll run");
  if (run.status === "paid") conflict("Paid payroll cannot be reverted.");
  if (run.status !== "finalized") conflict("Only finalized payroll can be reverted.");

  const { startDate, endDate } = monthBounds(run.year, run.month);
  const updated = await runInTx(async (session) => {
    const sessOpts = session ? { session } : {};
    await dailyAttendanceTable.updateMany(
      { date: { $gte: startDate, $lte: endDate } },
      { $set: { lockedForPayroll: false } },
      sessOpts,
    );
    let query = payrollRunsTable.findOneAndUpdate(
      { id: runId, status: "finalized" },
      { $set: { status: "reviewed" }, $unset: { finalizedAt: "", finalizedBy: "" } },
      { new: true },
    );
    if (session) query = query.session(session);
    return query;
  });

  if (!updated) conflict("Payroll run could not be reverted.");

  await logHrmAudit({
    actorId,
    action: "payroll_reverted",
    entityType: "payroll_run",
    entityId: runId,
    severity: "critical",
    metadata: { year: run.year, month: run.month },
  });

  return updated;
}



export async function regeneratePayslipsForRun(runId) {
  const run = await payrollRunsTable.findOne({ id: runId }).lean();
  if (!run) notFound("Payroll run");
  await syncPayslipsForRun(runId);
  return { ok: true, runId, month: run.month, year: run.year };
}

export async function listPayrollRuns() {

  return payrollRunsTable.find().sort({ year: -1, month: -1 }).lean();

}



export async function getPayrollRunLines(runId) {
  const lines = await payrollLinesTable.find({ payrollRunId: runId }).lean();
  const lineIds = lines.map((l) => l.id);
  const userIds = lines.map((l) => l.userId);
  const [users, structureRows, slips] = await Promise.all([
    usersTable
      .find({ id: { $in: userIds } }, { id: 1, name: 1, employeeId: 1, salary: 1, avatarUrl: 1 })
      .lean(),
    salaryStructuresTable.find({ userId: { $in: userIds } }).lean(),
    lineIds.length
      ? payrollSlipsTable.find({ payrollLineId: { $in: lineIds } }, { id: 1, payrollLineId: 1 }).lean()
      : Promise.resolve([]),
  ]);
  const slipByLineId = new Map(slips.map((s) => [s.payrollLineId, s.id]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const structureByUser = new Map(structureRows.map((r) => [r.userId, r]));

  return lines.map((l) => {
    const u = userMap.get(l.userId);
    const contract = resolveContractSalary({
      profileSalary: u?.salary ?? {},
      structureRow: structureByUser.get(l.userId),
    });
    return {
      ...l,
      employeeName: u?.name,
      employeeId: u?.employeeId,
      employeeAvatarUrl: u?.avatarUrl ?? null,
      payslipId: slipByLineId.get(l.id) ?? null,
      totalSalary: contract.totalSalary,
      contractNet: contract.contractNet,
    };
  });
} 

/** Admin salary-slip archive — optional period filter or all periods. */
export async function listAdminPayslips({ year, month, allPeriods = false, limit = 500 } = {}) {
  const query = {};
  if (!allPeriods) {
    if (year) query.year = year;
    if (month) query.month = month;
  }
  const slips = await payrollSlipsTable
    .find(query)
    .sort({ year: -1, month: -1, id: -1 })
    .limit(Math.min(Number(limit) || 500, 500))
    .lean();
  if (!slips.length) return [];
 
  const lineIds = slips.map((s) => s.payrollLineId);
  const userIds = [...new Set(slips.map((s) => s.userId))];
  const [lines, users, structureRows] = await Promise.all([
    payrollLinesTable.find({ id: { $in: lineIds } }).lean(),
    usersTable.find({ id: { $in: userIds } }, { id: 1, name: 1, employeeId: 1, designation: 1, avatarUrl: 1, salary: 1 }).lean(),
    salaryStructuresTable.find({ userId: { $in: userIds } }).lean(),
  ]);
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const structureByUser = new Map(structureRows.map((r) => [r.userId, r]));

  const runIds = [...new Set(lines.map((l) => l.payrollRunId))];
  const runs = runIds.length
    ? await payrollRunsTable.find({ id: { $in: runIds } }, { id: 1, status: 1 }).lean()
    : [];
  const runById = new Map(runs.map((r) => [r.id, r]));

  return slips.map((s) => {
    const line = lineById.get(s.payrollLineId);
    const user = userById.get(s.userId);
    const run = line ? runById.get(line.payrollRunId) : null;
    const paid = run?.status === "paid";
    const contract = resolveContractSalary({
      profileSalary: user?.salary ?? {},
      structureRow: structureByUser.get(s.userId),
    });
    return {
      id: s.id,
      payrollLineId: s.payrollLineId,
      userId: s.userId,
      year: s.year,
      month: s.month,
      employeeName: user?.name ?? `User #${s.userId}`,
      employeeId: user?.employeeId ?? null,
      employeeAvatarUrl: user?.avatarUrl ?? null,
      designation: user?.designation ?? null,
      gross: line?.gross ?? null,
      net: line?.net ?? null,
      contractNet: contract.configured ? contract.contractNet : null,
      status: paid ? "PAID" : "UNPAID",
      runStatus: run?.status ?? null,
    };
  });
}



export async function updatePayrollLine(lineId, body) {

  const line = await payrollLinesTable.findOne({ id: lineId });

  if (!line) notFound("Payroll line");

  const run = await payrollRunsTable.findOne({ id: line.payrollRunId });

  if (run?.status === "finalized" || run?.status === "paid") conflict("Payroll is finalized.");



  const patch = {};

  for (const key of PAYROLL_LINE_EDITABLE) {

    if (body[key] !== undefined) patch[key] = body[key];

  }

  const attendanceFieldsTouched =
    body.paidDays !== undefined || body.lopDays !== undefined || body.lateCount !== undefined;

  if (attendanceFieldsTouched) {
    const [lineUser, structureRow, { latePenaltyAmount }] = await Promise.all([
      usersTable.findOne({ id: line.userId }, { salary: 1 }).lean(),
      salaryStructuresTable.findOne({ userId: line.userId }).lean(),
      getHrmPolicyContext(),
    ]);
    const contract = resolveContractSalary({
      profileSalary: lineUser?.salary ?? {},
      structureRow: structureRow ?? {},
    });
    const amounts = computePayrollLineAmounts({
      gross: contract.payrollBase,
      paidDays: patch.paidDays ?? line.paidDays,
      lopDays: patch.lopDays ?? line.lopDays,
      lateCount: patch.lateCount ?? line.lateCount ?? 0,
      latePenaltyPerDay: latePenaltyAmount,
      // Preserve whatever this line already carries — new lines are created with 0 (see
      // generatePayrollRun), but legacy lines may still have real statutory amounts that
      // an attendance-field edit must not silently wipe.
      pfEmployee: line.pfEmployee ?? 0,
      esiEmployee: line.esiEmployee ?? 0,
      tds: line.tds ?? 0,
    });
    Object.assign(patch, amounts);
  } else {
    const gross = patch.gross ?? line.gross;
    const lopDeduction = patch.lopDeduction ?? line.lopDeduction ?? 0;
    const pfEmployee = patch.pfEmployee ?? line.pfEmployee ?? 0;
    const tds = patch.tds ?? line.tds ?? 0;
    const deductions = patch.deductions ?? pfEmployee + tds + lopDeduction;
    patch.net = Math.max(0, Math.round((gross - deductions) * 100) / 100);
    patch.deductions = Math.round(deductions * 100) / 100;
  }



  const updated = await payrollLinesTable.findOneAndUpdate({ id: lineId }, { $set: patch }, { new: true });
  await syncPayslipForLine(lineId);
  return updated;
}



export async function listMyPayslips(userId, year) {
  const query = { userId };
  if (year) query.year = year;
  const slips = await payrollSlipsTable.find(query).sort({ year: -1, month: -1 }).lean();
  if (!slips.length) return [];

  const lineIds = slips.map((s) => s.payrollLineId);
  const lines = await payrollLinesTable.find({ id: { $in: lineIds } }).lean();
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const runIds = [...new Set(lines.map((l) => l.payrollRunId))];
  const runs = runIds.length
    ? await payrollRunsTable.find({ id: { $in: runIds } }, { id: 1, status: 1 }).lean()
    : [];
  const runStatusById = new Map(runs.map((r) => [r.id, r.status]));
  const runByLine = new Map(
    lines.map((l) => [l.id, runStatusById.get(l.payrollRunId) ?? null]),
  );

  return slips
    .filter((s) => {
      const runStatus = runByLine.get(s.payrollLineId);
      return runStatus === "finalized" || runStatus === "paid";
    })
    .map((s) => ({
    id: s.id,
    month: s.month,
    year: s.year,
    payrollLineId: s.payrollLineId,
    net: lineById.get(s.payrollLineId)?.net ?? null,
    gross: lineById.get(s.payrollLineId)?.gross ?? null,
    status: runByLine.get(s.payrollLineId) === "paid" ? "PAID" : "UNPAID",
  }));
}

export async function getPayslipDetail(id, userId, { requirePublished = false } = {}) {
  const slip = await payrollSlipsTable.findOne({ id }).lean();
  if (!slip) notFound("Payslip");
  if (slip.userId !== userId) notFound("Payslip");

  const [user, line, structureRow, settings] = await Promise.all([
    usersTable.findOne({ id: slip.userId }, { id: 1, name: 1, employeeId: 1, department: 1, salary: 1 }).lean(),
    payrollLinesTable.findOne({ id: slip.payrollLineId }).lean(),
    salaryStructuresTable.findOne({ userId: slip.userId }).lean(),
    getOrCreateSettings(),
  ]);
  if (!line) notFound("Payroll line");

  if (requirePublished) {
    const run = await payrollRunsTable.findOne({ id: line.payrollRunId }, { status: 1 }).lean();
    if (!run || (run.status !== "finalized" && run.status !== "paid")) {
      notFound("Payslip");
    }
  }

  const contract = resolveContractSalary({
    profileSalary: user?.salary ?? {},
    structureRow: structureRow ?? {},
  });

  return {
    id: slip.id,
    month: slip.month,
    year: slip.year,
    companyName: settings.companyName ?? "Company",
    sealUrl: resolvePublicAssetUrl(settings.sealUrl),
    employeeName: user?.name ?? "Employee",
    employeeId: user?.employeeId ?? null,
    department: user?.department ?? null,
    basic: contract.basic,
    hra: contract.hra,
    allowances: contract.allowances,
    contractNet: contract.contractNet,
    earnedGross: line.gross,
    paidDays: line.paidDays,
    lopDays: line.lopDays,
    lateCount: line.lateCount,
    gross: line.gross,
    deductions: line.deductions,
    lopDeduction: line.lopDeduction ?? 0,
    latePenalty: line.latePenalty ?? 0,
    net: line.net,
    htmlContent: slip.htmlContent ?? null,
  };
}

export async function getPayslipById(id, userId) {
  return getPayslipDetail(id, userId);
}



function csvEscape(value) {

  const s = value == null ? "" : String(value);

  if (/[",\n]/.test(s)) return JSON.stringify(s);

  return s;

}



export async function exportPayrollCsv(runId) {

  const run = await payrollRunsTable.findOne({ id: runId }).lean();

  const lines = await getPayrollRunLines(runId);

  const header = "period,employeeId,employeeName,paidDays,lopDays,lateCount,gross,deductions,lopDeduction,latePenalty,net\n";

  const period = run ? `${run.month}/${run.year}` : "";

  const rows = lines.map((l) =>

    `${period},${l.employeeId ?? l.userId},${JSON.stringify(l.employeeName ?? "")},${l.paidDays},${l.lopDays},${l.lateCount},${l.gross},${l.deductions},${l.lopDeduction ?? 0},${l.latePenalty ?? 0},${l.net}`,

  ).join("\n");

  return header + rows;

}



/** Bank-transfer file with decrypted account details (HR export permission only). */

export async function exportPayrollBankTransferCsv(runId) {

  const run = await payrollRunsTable.findOne({ id: runId }).lean();

  if (!run) notFound("Payroll run");

  if (run.status !== "finalized" && run.status !== "paid") {

    conflict("Bank transfer export is available only after payroll is finalized.");

  }



  const lines = await getPayrollRunLines(runId);

  const exportUsers = await usersTable

    .find({ id: { $in: lines.map((l) => l.userId) } }, { id: 1, salary: 1, panNumber: 1 })

    .lean();

  const userByIdMap = new Map(exportUsers.map((u) => [u.id, u]));



  const header = "period,employeeId,employeeName,bankName,accountNumber,ifsc,pan,net\n";

  const period = `${run.month}/${run.year}`;

  const rows = lines.map((l) => {

    const exportUser = userByIdMap.get(l.userId);

    const bank = exportUser?.salary?.bankAccount ?? {};

    const bankName = bank.bankName ?? "";

    const accountNumber = bank.accountNumber ?? "";

    const ifsc = bank.ifsc ?? "";

    const pan = exportUser?.panNumber ?? "";

    return [

      period,

      l.employeeId ?? l.userId,

      csvEscape(l.employeeName ?? ""),

      csvEscape(bankName),

      csvEscape(accountNumber),

      csvEscape(ifsc),

      csvEscape(pan),

      l.net,

    ].join(",");

  }).join("\n");



  return header + rows;

}



export {

  aggregateAttendanceForPayroll,

  computePayrollLineAmounts,

  evaluatePayrollReadiness,

  resolveContractSalary,

} from "./payroll-compute.js";


