import mongoose, { Schema } from "mongoose";
import { leaveDayParts, leaveRequestStatuses } from "../../../constants/hrm.js";

const leaveTypeSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  isPaid: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: true },
  maxDaysPerYear: { type: Number, default: 12 },
  carryForwardAllowed: { type: Boolean, default: true },
  fifoPriority: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

const leaveBalanceSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  leaveTypeId: { type: Number, required: true, index: true },
  year: { type: Number, required: true, index: true },
  allocated: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  carriedForward: { type: Number, default: 0 },
  version: { type: Number, default: 0 },
}, { timestamps: true });

leaveBalanceSchema.index({ userId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

const leaveRequestSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  leaveTypeId: { type: Number, required: true, index: true },
  startDate: { type: String, required: true, index: true },
  endDate: { type: String, required: true },
  dayPart: { type: String, enum: leaveDayParts, default: "full" },
  days: { type: Number, required: true },
  lopDays: { type: Number, default: 0 },
  /** FIFO pending reservations across leave types (oldest accrual first). */
  balanceAllocations: [{
    leaveTypeId: { type: Number, required: true },
    days: { type: Number, required: true },
  }],
  reason: { type: String, required: true },
  status: { type: String, enum: leaveRequestStatuses, default: "pending", index: true },
  reviewedBy: { type: Number, ref: "Users" },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
}, { timestamps: true });

leaveRequestSchema.index({ userId: 1, status: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

const LeaveTypes = mongoose.models.LeaveTypes || mongoose.model("LeaveTypes", leaveTypeSchema);
const LeaveBalances = mongoose.models.LeaveBalances || mongoose.model("LeaveBalances", leaveBalanceSchema);
const LeaveRequests = mongoose.models.LeaveRequests || mongoose.model("LeaveRequests", leaveRequestSchema);
const leaveTypesTable = LeaveTypes;
const leaveBalancesTable = LeaveBalances;
const leaveRequestsTable = LeaveRequests;

export { LeaveTypes, LeaveBalances, LeaveRequests, leaveTypesTable, leaveBalancesTable, leaveRequestsTable };
