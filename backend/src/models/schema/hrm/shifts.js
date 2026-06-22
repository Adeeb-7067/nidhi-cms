import mongoose, { Schema } from "mongoose";

const shiftTemplateSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  graceMinutesIn: { type: Number, default: 15, min: 0 },
  graceMinutesOut: { type: Number, default: 0, min: 0 },
  breakMinutes: { type: Number, default: 60, min: 0 },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  halfDayThresholdMinutes: { type: Number, default: 240 },
  fullDayThresholdMinutes: { type: Number, default: 450 },
}, { timestamps: true });

const shiftAssignmentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  shiftTemplateId: { type: Number, required: true, index: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
}, { timestamps: true });

shiftAssignmentSchema.index({ userId: 1, effectiveFrom: -1 });

const ShiftTemplates = mongoose.models.ShiftTemplates || mongoose.model("ShiftTemplates", shiftTemplateSchema);
const ShiftAssignments = mongoose.models.ShiftAssignments || mongoose.model("ShiftAssignments", shiftAssignmentSchema);
const shiftTemplatesTable = ShiftTemplates;
const shiftAssignmentsTable = ShiftAssignments;

export { ShiftTemplates, ShiftAssignments, shiftTemplatesTable, shiftAssignmentsTable };
