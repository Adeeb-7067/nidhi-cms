import {
  manualPayslipsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound } from "../../utils/route-errors.js";
import { getOrCreateSettings } from "../company-settings.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { generatePayslipHtmlFromCms, resolvePublicAssetUrl } from "./payslip-template.js";

const USER_FIELDS = {
  id: 1,
  name: 1,
  employeeId: 1,
  department: 1,
  designation: 1,
  joiningDate: 1,
  avatarUrl: 1,
  salary: 1,
};

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function parseYear(raw) {
  const year = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    badRequest("A valid year is required.", "year");
  }
  return year;
}

function parseMonth(raw) {
  const month = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    badRequest("A valid month (1-12) is required.", "month");
  }
  return month;
}

function parseNet(raw) {
  const net = Number(raw);
  if (!Number.isFinite(net) || net < 0) {
    badRequest("Enter a valid net salary amount.", "net");
  }
  return Math.round(net * 100) / 100;
}

/**
 * Render a net-only payslip using the shared CMS payslip template. The employee
 * salary is intentionally emptied so the earnings table collapses to a single
 * "Salary (earned)" line equal to the entered net amount.
 */
function buildManualPayslipHtml({ user, settings, year, month, net, paidDate }) {
  const run = { year, month, status: "paid" };
  const baseSalary = Number(user.salary?.netSalary) || 0;
  let gross = net;
  let deduction = 0;
  if (baseSalary > net) {
    gross = baseSalary;
    deduction = baseSalary - net;
  }
  const line = {
    gross,
    net,
    paidDays: daysInMonth(year, month),
    lopDays: 0,
    lateCount: 0,
    lopDeduction: 0,
    manualDeduction: deduction,
    paidOn: paidDate,
  };
  return generatePayslipHtmlFromCms({
    user,
    run,
    line,
    structure: {},
    settings,
    leaveSummary: null,
  });
}

async function loadEmployee(userId) {
  const user = await usersTable.findOne({ id: userId }, USER_FIELDS).lean();
  if (!user) badRequest("Selected employee was not found.", "userId");
  return user;
}

function toDetail(row, user, settings) {
  const baseSalary = Number(user?.salary?.netSalary) || 0;
  let gross = row.net;
  let deductions = 0;
  if (baseSalary > row.net) {
    gross = baseSalary;
    deductions = baseSalary - row.net;
  }
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    companyName: settings.companyName ?? "Company",
    sealUrl: resolvePublicAssetUrl(settings.sealUrl),
    employeeName: user?.name ?? "Employee",
    employeeId: user?.employeeId ?? null,
    department: user?.department ?? null,
    basic: user?.salary?.basicSalary ?? 0,
    hra: 0,
    allowances: user?.salary?.allowances ?? 0,
    contractNet: baseSalary > 0 ? baseSalary : row.net,
    earnedGross: gross,
    paidDays: daysInMonth(row.year, row.month),
    lopDays: 0,
    lateCount: 0,
    gross: gross,
    deductions: deductions,
    lopDeduction: 0,
    latePenalty: 0,
    net: row.net,
    manual: true,
    notes: row.notes ?? "",
    paidDate: row.paidDate ? new Date(row.paidDate).toISOString().slice(0, 10) : null,
    htmlContent: row.htmlContent ?? null,
  };
}

export async function upsertManualPayslip(body, actorId) {
  const userId = Number.parseInt(String(body.userId ?? ""), 10);
  if (!Number.isFinite(userId)) badRequest("Select an employee.", "userId");
  const year = parseYear(body.year);
  const month = parseMonth(body.month);
  const net = parseNet(body.net);
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  let paidDate = null;
  if (body.paidDate) {
    const d = new Date(body.paidDate);
    if (!Number.isNaN(d.getTime())) {
      paidDate = d;
    }
  }

  const [user, settings] = await Promise.all([loadEmployee(userId), getOrCreateSettings()]);
  const htmlContent = buildManualPayslipHtml({ user, settings, year, month, net, paidDate });

  const existing = await manualPayslipsTable.findOne({ userId, year, month });
  let row;
  if (existing) {
    existing.net = net;
    existing.notes = notes;
    existing.paidDate = paidDate;
    existing.htmlContent = htmlContent;
    existing.updatedBy = actorId;
    row = await existing.save();
  } else {
    const id = await getNextSequence("manual_payslips");
    row = await manualPayslipsTable.create({
      id,
      userId,
      year,
      month,
      net,
      notes,
      paidDate,
      htmlContent,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  await logHrmAudit({
    actorId,
    action: existing ? "manual_payslip_updated" : "manual_payslip_created",
    entityType: "manual_payslip",
    entityId: row.id,
    metadata: { userId, year, month, net },
  });

  return toDetail(row.toObject ? row.toObject() : row, user, settings);
}

export async function listManualPayslips({ year, month, userId, allPeriods = false } = {}) {
  const filter = {};
  if (!allPeriods) {
    if (year != null) filter.year = Number(year);
    if (month != null) filter.month = Number(month);
  }
  if (userId != null) filter.userId = Number(userId);

  const rows = await manualPayslipsTable
    .find(filter)
    .sort({ year: -1, month: -1, updatedAt: -1 })
    .lean();
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.userId))];
  const users = await usersTable.find({ id: { $in: ids } }, USER_FIELDS).lean();
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = byId.get(r.userId);
    return {
      id: r.id,
      userId: r.userId,
      year: r.year,
      month: r.month,
      net: r.net,
      notes: r.notes ?? "",
      paidDate: r.paidDate ? new Date(r.paidDate).toISOString().slice(0, 10) : null,
      employeeName: u?.name ?? "Employee",
      employeeId: u?.employeeId ?? null,
      employeeAvatarUrl: u?.avatarUrl ?? null,
      designation: u?.designation ?? null,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
    };
  });
}

export async function getManualPayslipDetail(id) {
  const row = await manualPayslipsTable.findOne({ id }).lean();
  if (!row) notFound("Manual payslip");
  const [user, settings] = await Promise.all([
    usersTable.findOne({ id: row.userId }, USER_FIELDS).lean(),
    getOrCreateSettings(),
  ]);
  return toDetail(row, user, settings);
}

export async function deleteManualPayslip(id, actorId) {
  const row = await manualPayslipsTable.findOne({ id }).lean();
  if (!row) notFound("Manual payslip");
  await manualPayslipsTable.deleteOne({ id });
  await logHrmAudit({
    actorId,
    action: "manual_payslip_deleted",
    entityType: "manual_payslip",
    entityId: id,
    severity: "critical",
    metadata: { userId: row.userId, year: row.year, month: row.month },
  });
  return { message: "Manual payslip deleted" };
}
