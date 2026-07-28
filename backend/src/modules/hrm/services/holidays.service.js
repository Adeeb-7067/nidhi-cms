import { companyHolidaysTable, getNextSequence } from "../../../models/schema/index.js";
import { notFound } from "../../../utils/route-errors.js";

export async function listHolidays({ startDate, endDate, year } = {}) {
  const query = {};
  if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
  else if (year) query.year = year;
  return companyHolidaysTable.find(query).sort({ date: 1 }).lean();
}

export async function createHoliday(body) {
  const id = await getNextSequence("company_holidays");
  return companyHolidaysTable.create({
    id,
    date: body.date,
    name: body.name,
    type: body.type ?? "public",
    scope: body.scope ?? "company",
    departmentIds: body.departmentIds ?? [],
    year: parseInt(body.date.slice(0, 4), 10),
  });
}

export async function updateHoliday(id, body) {
  const hol = await companyHolidaysTable.findOneAndUpdate({ id }, { $set: body }, { new: true });
  if (!hol) notFound("Holiday");
  return hol;
}

export async function deleteHoliday(id) {
  const result = await companyHolidaysTable.deleteOne({ id });
  if (!result.deletedCount) notFound("Holiday");
}

export async function getHolidaysForRange(startDate, endDate, departmentId = null) {
  const holidays = await companyHolidaysTable.find({
    date: { $gte: startDate, $lte: endDate },
  }).lean();
  return holidays.filter((h) => {
    if (h.scope === "company") return true;
    if (!departmentId) return false;
    return h.departmentIds?.includes(departmentId);
  });
}
