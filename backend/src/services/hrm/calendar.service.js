import { companyHolidaysTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { eachDateInRange } from "./hrm-date-utils.js";

function monthRange(year, month) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function dobToCalendarDate(dob, year) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function getCalendarMonth(year, month) {
  const { startDate, endDate } = monthRange(year, month);
  const holidays = await companyHolidaysTable
    .find({ date: { $gte: startDate, $lte: endDate } })
    .sort({ date: 1 })
    .lean();

  const employees = await usersTable
    .find({ role: { $in: hrmEmployeeRoles }, status: "active", dob: { $ne: null } })
    .select({ id: 1, name: 1, employeeId: 1, dob: 1 })
    .lean();

  const birthdays = [];
  for (const emp of employees) {
    const date = dobToCalendarDate(emp.dob, year);
    if (!date || date < startDate || date > endDate) continue;
    birthdays.push({
      userId: emp.id,
      name: emp.name,
      employeeId: emp.employeeId ?? null,
      date,
    });
  }

  const days = {};
  const pushEvent = (date, event) => {
    if (!days[date]) days[date] = [];
    days[date].push(event);
  };

  for (const h of holidays) {
    const kind = h.type === "optional" ? "company_event" : "holiday";
    pushEvent(h.date, {
      kind,
      id: h.id,
      label: h.name,
      type: h.type,
      scope: h.scope,
    });
  }

  for (const b of birthdays) {
    pushEvent(b.date, {
      kind: "birthday",
      userId: b.userId,
      label: `${b.name}'s birthday`,
      employeeId: b.employeeId,
    });
  }

  const holidaysCount = holidays.filter((h) => h.type !== "optional").length;
  const companyEventsCount = holidays.filter((h) => h.type === "optional").length;
  const birthdaysCount = birthdays.length;
  const eventsThisMonth = Object.values(days).reduce((n, list) => n + list.length, 0);

  return {
    year,
    month,
    startDate,
    endDate,
    stats: {
      eventsThisMonth,
      holidays: holidaysCount,
      birthdays: birthdaysCount,
      companyEvents: companyEventsCount,
    },
    holidays,
    birthdays,
    days,
  };
}

/** Seed every Sunday in a year as a company holiday (skip existing dates). */
export async function generateSundayHolidays(year) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  let created = 0;
  let skipped = 0;

  for (const date of eachDateInRange(startDate, endDate)) {
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (dow !== 0) continue;

    const existing = await companyHolidaysTable.findOne({ date }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    const id = await getNextSequence("company_holidays");
    await companyHolidaysTable.create({
      id,
      date,
      name: "Sunday",
      type: "public",
      scope: "company",
      departmentIds: [],
      year,
    });
    created += 1;
  }

  return { year, created, skipped };
}
