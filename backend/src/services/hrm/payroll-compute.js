import { eachDateInRange, getDayOfWeek } from "./hrm-date-utils.js";

/** Days in month for daily-rate pay (platform convention: gross / 30). */
export const PAYROLL_DAYS_IN_MONTH = 30;

/** Count Sundays in a calendar range (YYYY-MM-DD, inclusive). */
export function countSundaysInRange(startDate, endDate) {
  let count = 0;
  for (const date of eachDateInRange(startDate, endDate)) {
    if (getDayOfWeek(date) === 0) count += 1;
  }
  return count;
}

const PAYROLL_PAID_STATUSES = new Set(["present", "holiday", "weekend"]);

function addLeaveFraction(byDate, date, paid, lop) {
  const row = byDate.get(date) ?? { paid: 0, lop: 0 };
  row.paid += paid;
  row.lop += lop;
  byDate.set(date, row);
}

/**
 * Map each calendar date in a pay period to paid-leave vs LOP fractions from approved requests.
 * Paid portion = days covered by leave balance; LOP = unpaid overflow on the request.
 */
export function buildLeavePayrollByDate(
  leaveRequests,
  { startDate, endDate, weekendDays, holidayDates = new Set() },
) {
  const byDate = new Map();

  for (const req of leaveRequests ?? []) {
    if (req.status !== "approved") continue;
    if (req.endDate < startDate || req.startDate > endDate) continue;

    const paidTotal = Math.max(0, Number(req.days ?? 0) - Number(req.lopDays ?? 0));
    const lopTotal = Math.max(0, Number(req.lopDays ?? 0));
    const dayPart = req.dayPart ?? "full";

    if (dayPart !== "full") {
      const date = req.startDate;
      if (date < startDate || date > endDate) continue;
      if (weekendDays.includes(getDayOfWeek(date))) continue;
      if (holidayDates.has(date)) continue;
      addLeaveFraction(byDate, date, paidTotal, lopTotal);
      continue;
    }

    const workingDates = [];
    for (const date of eachDateInRange(req.startDate, req.endDate)) {
      if (weekendDays.includes(getDayOfWeek(date))) continue;
      if (holidayDates.has(date)) continue;
      workingDates.push(date);
    }

    for (let i = 0; i < workingDates.length; i++) {
      const date = workingDates[i];
      if (date < startDate || date > endDate) continue;
      const paid = i < paidTotal ? 1 : 0;
      const lop = i >= paidTotal && i < paidTotal + lopTotal ? 1 : 0;
      addLeaveFraction(byDate, date, paid, lop);
    }
  }

  return byDate;
}

/**
 * Derive paid / LOP counts from attendance summaries for one employee.
 * - All Sundays in the pay period are paid automatically.
 * - Present / holiday days are paid.
 * - Approved leave from balance (paid leave quota) counts as paid days.
 * - Only unpaid leave (LOP on the request) is deducted.
 * - Absent days are unpaid with no LOP line.
 */
export function aggregateAttendanceForPayroll(
  summaries,
  { startDate, endDate, leavePayrollByDate },
) {
  let paidDays = 0;
  let lopDays = 0;

  for (const s of summaries) {
    if (s.status === "on_leave") {
      const leave = leavePayrollByDate?.get(s.date);
      if (leave) {
        // Count paid + lop together in paidDays so earned already includes the
        // LOP day's rate; lopDeduction then removes it explicitly in
        // computePayrollLineAmounts. Without this, LOP days would be deducted
        // twice (once from paidDays and once via lopDeduction).
        paidDays += leave.paid + leave.lop;
        lopDays += leave.lop;
      }
      continue;
    }
    if (PAYROLL_PAID_STATUSES.has(s.status)) {
      paidDays += 1;
      // Half-day LOP leave: employee clocked in so status is "present", but
      // the approved leave request marks part of the day as LOP. Deduct that
      // fraction explicitly; keeping paidDays at 1 means the worked half is
      // still earned, and lopDeduction removes only the LOP fraction.
      const partialLeave = leavePayrollByDate?.get(s.date);
      if (partialLeave?.lop > 0) {
        lopDays += partialLeave.lop;
      }
    }
  }

  return {
    paidDays: Math.round(paidDays * 100) / 100,
    lopDays: Math.round(lopDays * 100) / 100,
    lateCount: 0,
  };
}

/**
 * Attendance-based pay: earn (gross/30 × paidDays), deduct LOP for unpaid leave days + statutory.
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
  const earned = Math.round(dailyRate * paidDays * 100) / 100;
  const lopDeduction = Math.round(dailyRate * lopDays * 100) / 100;
  const statutory = (pfEmployee ?? 0) + (esiEmployee ?? 0) + (tds ?? 0);
  const deductions = Math.round((statutory + lopDeduction) * 100) / 100;
  const net = Math.max(0, Math.round((earned - deductions) * 100) / 100);

  return {
    paidDays,
    lopDays,
    lateCount,
    gross: earned,
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
