import {
  shiftTemplatesTable,
  shiftAssignmentsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { notFound } from "../../utils/route-errors.js";
import { eachDateInRange } from "./hrm-date-utils.js";

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function computeExpectedMinutes(template) {
  if (!template) return 0;
  const start = parseTimeToMinutes(template.startTime);
  const end = parseTimeToMinutes(template.endTime);
  return Math.max(0, end - start - (template.breakMinutes ?? 0));
}

export async function listShiftTemplates() {
  return shiftTemplatesTable.find().sort({ name: 1 }).lean();
}

export async function createShiftTemplate(body) {
  const id = await getNextSequence("shift_templates");
  return shiftTemplatesTable.create({ id, ...body });
}

export async function updateShiftTemplate(id, body) {
  const tpl = await shiftTemplatesTable.findOneAndUpdate({ id }, { $set: body }, { new: true });
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
  const template = await shiftTemplatesTable.findOne({ id: assignment.shiftTemplateId }).lean();
  return resolveShiftTemplateForDate(template, dateStr);
}

function resolveShiftTemplateForDate(template, dateStr) {
  if (!template) return null;
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  if (!template.workingDays?.includes(dow)) return null;
  return template;
}

function assignmentCoversDate(assignment, dateStr) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const from = new Date(assignment.effectiveFrom);
  const to = assignment.effectiveTo ? new Date(assignment.effectiveTo) : null;
  return from <= date && (!to || to >= date);
}

/** Batch-load shift templates for all user-days in a range (avoids N×M DB queries). */
export async function buildShiftMapForRange(userIds, startDate, endDate, { defaultTemplateId = null } = {}) {
  const shiftMap = new Map();
  if (!userIds.length) return shiftMap;

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
      template = resolveShiftTemplateForDate(template, date);
      if (template) shiftMap.set(`${userId}:${date}`, template);
    }
  }

  return shiftMap;
}

export async function seedDefaultShift(settings) {
  let tpl = await shiftTemplatesTable.findOne({ name: "Default Office" }).lean();
  if (!tpl) {
    const id = await getNextSequence("shift_templates");
    tpl = await shiftTemplatesTable.create({
      id,
      name: "Default Office",
      startTime: "10:00",
      endTime: "19:00",
      graceMinutesIn: 15,
      breakMinutes: 60,
      workingDays: [1, 2, 3, 4, 5],
    });
  }
  return tpl;
}
