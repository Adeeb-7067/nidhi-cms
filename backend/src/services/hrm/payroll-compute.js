import { isPaidAttendanceStatus } from "../../constants/attendance-status.js";

/** Days in month for daily-rate LOP (platform convention: gross / 30). */
export const PAYROLL_DAYS_IN_MONTH = 30;

/**
 * Derive paid / LOP / late counts from attendance summaries for one employee.
 */
export function aggregateAttendanceForPayroll(summaries) {
  let paidDays = 0;
  let lopDays = 0;
  let lateCount = 0;

  for (const s of summaries) {
    if (isPaidAttendanceStatus(s.status) && s.compliance !== "absent") {
      paidDays += 1;
    }
    if (s.status === "absent" || s.compliance === "short") {
      lopDays += 1;
    }
    if (s.status === "late" || s.status === "onsite") {
      lateCount += 1;
    }
  }

  return { paidDays, lopDays, lateCount };
}

/**
 * Compute payroll line amounts from structure + attendance counts.
 * Pure — no DB access.
 */
export function computePayrollLineAmounts({
  gross = 0,
  paidDays = 0,
  lopDays = 0,
  lateCount = 0,
  pfEmployee = 0,
  esiEmployee = 0,
  tds = 0,
  daysInMonth = PAYROLL_DAYS_IN_MONTH,
}) {
  const dailyRate = gross / daysInMonth;
  const lopDeduction = Math.round(dailyRate * lopDays * 100) / 100;
  const statutory = (pfEmployee ?? 0) + (esiEmployee ?? 0) + (tds ?? 0);
  const deductions = Math.round((statutory + lopDeduction) * 100) / 100;
  const net = Math.max(0, Math.round((gross - deductions) * 100) / 100);

  return {
    paidDays,
    lopDays,
    lateCount,
    gross,
    lopDeduction,
    pfEmployee: pfEmployee ?? 0,
    tds: tds ?? 0,
    deductions,
    net,
  };
}

/** Whether pre-run blockers allow payroll generation/finalization. */
export function evaluatePayrollReadiness(checklist) {
  const blockerCount = checklist.blockers.reduce((n, b) => n + (b.count ?? 0), 0);
  return {
    ready: blockerCount === 0,
    blockerCount,
  };
}
