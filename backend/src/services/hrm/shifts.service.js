import {
  shiftTemplatesTable,
  shiftAssignmentsTable,
  usersTable,
  companySettingsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { notFound } from "../../utils/route-errors.js";
import { eachDateInRange } from "./hrm-date-utils.js";
import { getOrCreateSettings, invalidateSettingsCache } from "../company-settings.js";

export const DEFAULT_WEEKEND_DAYS = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Canonical default shift: 9:30 AM – 6:00 PM with 30 min break → 8 h expected. */
export const DEFAULT_OFFICE_SHIFT = {
  name: "Default Office",
  startTime: "09:30",
  endTime: "18:00",
  graceMinutesIn: 15,
  breakMinutes: 30,
  workingDays: [1, 2, 3, 4, 5, 6],
  isDefault: true,
};

// workingDays is derived from the global weekend setting (see resolveShiftTemplateForDate),
// so it must not be clobbered when the default template is re-seeded.
const { workingDays: _defaultShiftWorkingDays, ...DEFAULT_OFFICE_SHIFT_FIELDS } = DEFAULT_OFFICE_SHIFT;

/** The global weekend setting is the single source of truth for weekly-offs. */
export function resolveWeekendDays(settings) {
  return settings?.hrmWeekendDays?.length ? settings.hrmWeekendDays : DEFAULT_WEEKEND_DAYS;
}

/** Working days = every weekday that is not a global weekly-off. */
export function deriveWorkingDaysFromWeekend(weekendDays) {
  const offs = weekendDays?.length ? weekendDays : DEFAULT_WEEKEND_DAYS;
  return ALL_DAYS.filter((d) => !offs.includes(d));
}

/** Persist the derived working days onto every shift template (call when weekend setting changes). */
export async function syncShiftTemplatesWorkingDays(weekendDays) {
  const workingDays = deriveWorkingDaysFromWeekend(weekendDays);
  await shiftTemplatesTable.updateMany({}, { $set: { workingDays } });
  return workingDays;
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function computeExpectedMinutes(template) {
  if (!template?.startTime || !template?.endTime) return 0;
  const start = parseTimeToMinutes(template.startTime);
  let end = parseTimeToMinutes(template.endTime);
  if (end <= start) end += 24 * 60;
  const breakMins = template.breakMinutes ?? 0;
  return Math.max(0, end - start - breakMins);
}

/** Human-readable expected hours for a shift template (e.g. "8h"). */
export function formatExpectedHours(template) {
  const mins = computeExpectedMinutes(template);
  if (!mins) return "0h";
  return `${Math.round((mins / 60) * 10) / 10}h`;
}

export async function listShiftTemplates() {
  return shiftTemplatesTable.find().sort({ name: 1 }).lean();
}

export async function createShiftTemplate(body) {
  const id = await getNextSequence("shift_templates");
  const settings = await getOrCreateSettings();
  const workingDays = deriveWorkingDaysFromWeekend(resolveWeekendDays(settings));
  return shiftTemplatesTable.create({ id, ...body, workingDays });
}

export async function updateShiftTemplate(id, body) {
  const settings = await getOrCreateSettings();
  const workingDays = deriveWorkingDaysFromWeekend(resolveWeekendDays(settings));
  const tpl = await shiftTemplatesTable.findOneAndUpdate(
    { id },
    { $set: { ...body, workingDays } },
    { new: true },
  );
  if (!tpl) notFound("Shift template");
  return tpl;
}

export async function listShiftAssignments(userId) {
  const query = userId ? { userId } : {};
  return shiftAssignmentsTable.find(query).sort({ effectiveFrom: -1 }).lean();
}

export async function assignShift(body) {
  await endOpenShiftAssignments(body.userId, new Date(body.effectiveFrom));
  const id = await getNextSequence("shift_assignments");
  const assignment = await shiftAssignmentsTable.create({
    id,
    userId: body.userId,
    shiftTemplateId: body.shiftTemplateId,
    effectiveFrom: new Date(body.effectiveFrom),
    effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
  });
  await usersTable.updateOne({ id: body.userId }, { $set: { shiftId: body.shiftTemplateId } });
  return assignment;
}

/** End active shift assignments so the employee falls back to company default. */
export async function clearShiftForUser(userId, asOf = new Date()) {
  const endDate = new Date(asOf);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  await shiftAssignmentsTable.updateMany(
    {
      userId,
      effectiveFrom: { $lte: asOf },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: asOf } }],
    },
    { $set: { effectiveTo: endDate } },
  );
  await usersTable.updateOne({ id: userId }, { $set: { shiftId: null } });
}

async function endOpenShiftAssignments(userId, effectiveFrom) {
  const endDate = new Date(effectiveFrom);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  await shiftAssignmentsTable.updateMany(
    {
      userId,
      effectiveFrom: { $lt: effectiveFrom },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: effectiveFrom } }],
    },
    { $set: { effectiveTo: endDate } },
  );
}

export async function resolveShiftForUser(userId, dateStr) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const assignment = await shiftAssignmentsTable.findOne({
    userId,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).sort({ effectiveFrom: -1 }).lean();

  if (!assignment) return null;
  const weekendDays = resolveWeekendDays(await getOrCreateSettings());
  const template = await shiftTemplatesTable.findOne({ id: assignment.shiftTemplateId }).lean();
  return normalizeShiftTemplate(resolveShiftTemplateForDate(template, dateStr, weekendDays), weekendDays);
}

/** Effective shift for attendance/clock-out: assignment → profile shift → company default. */
export async function resolveEffectiveShiftForUser(userId, dateStr, { settings = null } = {}) {
  const resolvedSettings = settings ?? (await getOrCreateSettings());
  const weekendDays = resolveWeekendDays(resolvedSettings);
  const date = new Date(`${dateStr}T12:00:00Z`);
  const assignment = await shiftAssignmentsTable.findOne({
    userId,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).sort({ effectiveFrom: -1 }).lean();

  let template = null;
  if (assignment) {
    template = await shiftTemplatesTable.findOne({ id: assignment.shiftTemplateId }).lean();
  }
  if (!template) {
    const user = await usersTable.findOne({ id: userId }, { shiftId: 1 }).lean();
    if (user?.shiftId) {
      template = await shiftTemplatesTable.findOne({ id: user.shiftId }).lean();
    }
  }
  if (!template) {
    template = await getDefaultShiftTemplate(resolvedSettings);
  }
  return normalizeShiftTemplate(resolveShiftTemplateForDate(template, dateStr, weekendDays), weekendDays);
}

function resolveShiftTemplateForDate(template, dateStr, weekendDays = DEFAULT_WEEKEND_DAYS) {
  if (!template) return null;
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  // Working days are derived from the global weekend setting — the single source of truth.
  if (weekendDays.includes(dow)) return null;
  return template;
}

function assignmentCoversDate(assignment, dateStr) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const from = new Date(assignment.effectiveFrom);
  const to = assignment.effectiveTo ? new Date(assignment.effectiveTo) : null;
  return from <= date && (!to || to >= date);
}

/** Batch-load shift templates for all user-days in a range (avoids N×M DB queries). */
export async function buildShiftMapForRange(userIds, startDate, endDate, { defaultTemplateId = null, weekendDays = null } = {}) {
  const shiftMap = new Map();
  if (!userIds.length) return shiftMap;

  const resolvedWeekend = weekendDays ?? resolveWeekendDays(await getOrCreateSettings());
  const rangeStart = new Date(`${startDate}T12:00:00Z`);
  const rangeEnd = new Date(`${endDate}T12:00:00Z`);

  const [assignments, defaultTemplate, users] = await Promise.all([
    shiftAssignmentsTable
      .find({
        userId: { $in: userIds },
        effectiveFrom: { $lte: rangeEnd },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: rangeStart } }],
      })
      .sort({ effectiveFrom: -1 })
      .lean(),
    defaultTemplateId
      ? shiftTemplatesTable.findOne({ id: defaultTemplateId }).lean()
      : null,
    usersTable.find({ id: { $in: userIds } }, { id: 1, shiftId: 1 }).lean(),
  ]);

  const profileShiftByUser = new Map(users.map((u) => [u.id, u.shiftId ?? null]));
  const templateIds = [...new Set(assignments.map((a) => a.shiftTemplateId))];
  for (const shiftId of profileShiftByUser.values()) {
    if (shiftId) templateIds.push(shiftId);
  }
  if (defaultTemplate?.id) templateIds.push(defaultTemplate.id);
  const templates = templateIds.length
    ? await shiftTemplatesTable.find({ id: { $in: templateIds } }).lean()
    : [];
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const assignmentsByUser = new Map();
  for (const assignment of assignments) {
    const list = assignmentsByUser.get(assignment.userId) ?? [];
    list.push(assignment);
    assignmentsByUser.set(assignment.userId, list);
  }

  for (const userId of userIds) {
    const userAssignments = assignmentsByUser.get(userId) ?? [];
    for (const date of eachDateInRange(startDate, endDate)) {
      const assignment = userAssignments.find((a) => assignmentCoversDate(a, date));
      let template = assignment
        ? templateById.get(assignment.shiftTemplateId)
        : null;
      if (!template) {
        const profileShiftId = profileShiftByUser.get(userId);
        if (profileShiftId) template = templateById.get(profileShiftId) ?? null;
      }
      if (!template) template = defaultTemplate;
      template = normalizeShiftTemplate(resolveShiftTemplateForDate(template, date, resolvedWeekend), resolvedWeekend);
      if (template) shiftMap.set(`${userId}:${date}`, template);
    }
  }

  return shiftMap;
}

export async function seedDefaultShift() {
  let tpl = await shiftTemplatesTable.findOne({ name: DEFAULT_OFFICE_SHIFT.name }).lean();
  if (!tpl) {
    const id = await getNextSequence("shift_templates");
    tpl = await shiftTemplatesTable.create({ id, ...DEFAULT_OFFICE_SHIFT });
    return tpl;
  }
  tpl = await shiftTemplatesTable.findOneAndUpdate(
    { id: tpl.id },
    { $set: DEFAULT_OFFICE_SHIFT_FIELDS },
    { new: true },
  );
  return tpl;
}

/** Load the company default shift template document (seeds when missing). */
export async function getDefaultShiftTemplate(settings) {
  const id = await resolveDefaultShiftTemplateId(settings);
  let template = await shiftTemplatesTable.findOne({ id }).lean();
  if (template?.name === DEFAULT_OFFICE_SHIFT.name) {
    template = await shiftTemplatesTable.findOneAndUpdate(
      { id },
      { $set: DEFAULT_OFFICE_SHIFT_FIELDS },
      { new: true },
    );
  }
  return normalizeShiftTemplate(template);
}

function normalizeShiftTemplate(template, weekendDays = null) {
  if (!template) return null;
  return {
    ...template,
    workingDays: weekendDays
      ? deriveWorkingDaysFromWeekend(weekendDays)
      : template.workingDays?.length
        ? template.workingDays
        : [1, 2, 3, 4, 5],
  };
}

/** Ensure company settings reference a default shift used for expected hours when none is assigned. */
export async function resolveDefaultShiftTemplateId(settings) {
  if (settings?.hrmDefaultShiftTemplateId) {
    const existing = await shiftTemplatesTable
      .findOne({ id: settings.hrmDefaultShiftTemplateId })
      .lean();
    if (existing) return existing.id;
  }
  const tpl = await seedDefaultShift();
  if (settings?.id && settings.hrmDefaultShiftTemplateId !== tpl.id) {
    await companySettingsTable.updateOne(
      { id: settings.id },
      { $set: { hrmDefaultShiftTemplateId: tpl.id } },
    );
    invalidateSettingsCache();
  }
  return tpl.id;
}
