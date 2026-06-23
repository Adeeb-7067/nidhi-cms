import {

  salaryStructuresTable,

  payrollRunsTable,

  payrollLinesTable,

  payrollSlipsTable,

  usersTable,

  getNextSequence,

} from "../../models/schema/index.js";

import { dailyAttendanceTable } from "../../models/schema/hrm/daily-attendance.js";

import { leaveRequestsTable } from "../../models/schema/hrm/leave.js";

import { attendanceCorrectionsTable } from "../../models/schema/hrm/attendance.js";

import { shiftAssignmentsTable } from "../../models/schema/hrm/shifts.js";

import { HttpError } from "../../lib/http-error.js";
import { conflict, notFound, badRequest } from "../../utils/route-errors.js";

import { getAttendanceDailySummaries } from "./attendance.service.js";

import { logHrmAudit } from "./hrm-audit.service.js";

import { getOrCreateSettings } from "../company-settings.js";

import { staffEmployeeRoles } from "../../constants/user-roles.js";

import { runInTx } from "../../lib/db-tx.js";

import { encryptIntoFields, decryptFromFields, maskTail } from "../../lib/hrm-crypto.js";

import {
  aggregateAttendanceForPayroll,
  computePayrollLineAmounts,
  evaluatePayrollReadiness,
} from "./payroll-compute.js";
import { generatePayslipHtmlFromCms } from "./payslip-template.js";

const PAYROLL_LINE_EDITABLE = ["paidDays", "lopDays", "lateCount", "gross", "deductions", "lopDeduction", "notes"];

const BANK_ENCRYPT_FIELDS = ["bankAccountNumber", "ifscCode", "bankName", "panNumber"];



function monthBounds(year, month) {

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

  const endDay = new Date(year, month, 0).getDate();

  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  return { startDate, endDate };

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

  const lines = await payrollLinesTable.find({ payrollRunId: runId }).lean();
  if (!lines.length) return;

  const settings = await getOrCreateSettings();
  const existing = await payrollSlipsTable
    .find({ payrollLineId: { $in: lines.map((l) => l.id) } })
    .lean();
  const slipByLineId = new Map(existing.map((s) => [s.payrollLineId, s]));
  const sessOpts = session ? { session } : {};

  for (const line of lines) {
    const [user, structure] = await Promise.all([
      usersTable.findOne({ id: line.userId }).lean(),
      salaryStructuresTable.findOne({ userId: line.userId }).lean(),
    ]);
    const html = generatePayslipHtmlFromCms({ user, run, line, structure, settings });
    const prior = slipByLineId.get(line.id);

    if (prior) {
      await payrollSlipsTable.updateOne(
        { id: prior.id },
        { $set: { htmlContent: html, year: run.year, month: run.month, userId: line.userId } },
        sessOpts,
      );
    } else {
      const slipId = await getNextSequence("payroll_slips");
      const doc = {
        id: slipId,
        payrollLineId: line.id,
        userId: line.userId,
        year: run.year,
        month: run.month,
        htmlContent: html,
      };
      if (session) {
        await payrollSlipsTable.create([doc], { session });
      } else {
        await payrollSlipsTable.create(doc);
      }
    }
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

    .find({ role: { $in: staffEmployeeRoles }, status: "active" }, { id: 1, name: 1, employeeId: 1 })

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



  const structures = await salaryStructuresTable.find({ userId: { $in: staffIds } }, { userId: 1 }).lean();

  const structureUserIds = new Set(structures.map((s) => s.userId));

  const missingStructure = staff.filter((u) => !structureUserIds.has(u.id));



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

      message: "Active staff missing salary structure",

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



export async function getSalaryStructureForUser(userId) {

  const row = await salaryStructuresTable.findOne({ userId }).lean();

  if (!row) return null;

  const user = await usersTable.findOne({ id: userId }, { id: 1, name: 1, employeeId: 1 }).lean();

  return formatSalaryStructure(row, user);

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

  const staff = await usersTable.find({ role: { $in: staffEmployeeRoles }, status: "active" }).lean();

  const { summaries } = await getAttendanceDailySummaries({ startDate, endDate });



  for (const user of staff) {

    const userSummaries = summaries.filter((s) => s.userId === user.id);

    const counts = aggregateAttendanceForPayroll(userSummaries);

    const structure = await salaryStructuresTable.findOne({ userId: user.id }).lean();

    const amounts = computePayrollLineAmounts({

      gross: structure?.gross ?? 0,

      ...counts,

      pfEmployee: structure?.pfEmployee ?? 0,

      esiEmployee: structure?.esiEmployee ?? 0,

      tds: structure?.tds ?? 0,

    });



    const lineId = await getNextSequence("payroll_lines");

    await payrollLinesTable.create({

      id: lineId,

      payrollRunId: run.id,

      userId: user.id,

      ...amounts,

      pfEmployer: structure?.pfEmployer ?? 0,

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

  const updated = await payrollRunsTable.findOneAndUpdate(

    { id: runId, status: "finalized" },

    { $set: { status: "paid" } },

    { new: true },

  );

  if (!updated) conflict("Payroll run could not be marked paid.");



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



export async function listPayrollRuns() {

  return payrollRunsTable.find().sort({ year: -1, month: -1 }).lean();

}



export async function getPayrollRunLines(runId) {
  const lines = await payrollLinesTable.find({ payrollRunId: runId }).lean();
  const lineIds = lines.map((l) => l.id);
  const users = await usersTable.find({ id: { $in: lines.map((l) => l.userId) } }, { id: 1, name: 1, employeeId: 1 }).lean();
  const slips = lineIds.length
    ? await payrollSlipsTable.find({ payrollLineId: { $in: lineIds } }, { id: 1, payrollLineId: 1 }).lean()
    : [];
  const slipByLineId = new Map(slips.map((s) => [s.payrollLineId, s.id]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return lines.map((l) => ({
    ...l,
    employeeName: userMap.get(l.userId)?.name,
    employeeId: userMap.get(l.userId)?.employeeId,
    payslipId: slipByLineId.get(l.id) ?? null,
  }));
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
  const [lines, users] = await Promise.all([
    payrollLinesTable.find({ id: { $in: lineIds } }).lean(),
    usersTable.find({ id: { $in: userIds } }, { id: 1, name: 1, employeeId: 1, designation: 1 }).lean(),
  ]);
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const userById = new Map(users.map((u) => [u.id, u]));

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
    return {
      id: s.id,
      payrollLineId: s.payrollLineId,
      userId: s.userId,
      year: s.year,
      month: s.month,
      employeeName: user?.name ?? `User #${s.userId}`,
      employeeId: user?.employeeId ?? null,
      designation: user?.designation ?? null,
      gross: line?.gross ?? null,
      net: line?.net ?? null,
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



  const gross = patch.gross ?? line.gross;

  const lopDeduction = patch.lopDeduction ?? line.lopDeduction ?? 0;

  const pfEmployee = patch.pfEmployee ?? line.pfEmployee ?? 0;

  const tds = patch.tds ?? line.tds ?? 0;

  const deductions = patch.deductions ?? (pfEmployee + tds + lopDeduction);

  patch.net = Math.max(0, Math.round((gross - deductions) * 100) / 100);

  patch.deductions = Math.round(deductions * 100) / 100;



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

  const [user, line, settings] = await Promise.all([
    usersTable.findOne({ id: slip.userId }, { id: 1, name: 1, employeeId: 1, department: 1 }).lean(),
    payrollLinesTable.findOne({ id: slip.payrollLineId }).lean(),
    getOrCreateSettings(),
  ]);
  if (!line) notFound("Payroll line");

  if (requirePublished) {
    const run = await payrollRunsTable.findOne({ id: line.payrollRunId }, { status: 1 }).lean();
    if (!run || (run.status !== "finalized" && run.status !== "paid")) {
      notFound("Payslip");
    }
  }

  const structure = await salaryStructuresTable.findOne({ userId: slip.userId }).lean();

  return {
    id: slip.id,
    month: slip.month,
    year: slip.year,
    companyName: settings.companyName ?? "Company",
    employeeName: user?.name ?? "Employee",
    employeeId: user?.employeeId ?? null,
    department: user?.department ?? null,
    basic: structure?.basic ?? 0,
    hra: structure?.hra ?? 0,
    allowances: structure?.allowances ?? 0,
    paidDays: line.paidDays,
    lopDays: line.lopDays,
    lateCount: line.lateCount,
    gross: line.gross,
    deductions: line.deductions,
    lopDeduction: line.lopDeduction ?? 0,
    pfEmployee: line.pfEmployee ?? 0,
    tds: line.tds ?? 0,
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

  const header = "period,employeeId,employeeName,paidDays,lopDays,lateCount,gross,deductions,lopDeduction,net\n";

  const period = run ? `${run.month}/${run.year}` : "";

  const rows = lines.map((l) =>

    `${period},${l.employeeId ?? l.userId},${JSON.stringify(l.employeeName ?? "")},${l.paidDays},${l.lopDays},${l.lateCount},${l.gross},${l.deductions},${l.lopDeduction ?? 0},${l.net}`,

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

  const structures = await salaryStructuresTable

    .find({ userId: { $in: lines.map((l) => l.userId) } })

    .lean();

  const structureByUser = new Map(structures.map((s) => [s.userId, s]));



  const header = "period,employeeId,employeeName,bankName,accountNumber,ifsc,pan,net\n";

  const period = `${run.month}/${run.year}`;

  const rows = lines.map((l) => {

    const structure = structureByUser.get(l.userId);

    const bankName = decryptFromFields("bankName", structure) ?? "";

    const accountNumber = decryptFromFields("bankAccountNumber", structure) ?? "";

    const ifsc = decryptFromFields("ifscCode", structure) ?? "";

    const pan = decryptFromFields("panNumber", structure) ?? "";

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

} from "./payroll-compute.js";


