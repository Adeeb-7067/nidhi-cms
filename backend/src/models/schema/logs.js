import mongoose, { Schema } from "mongoose";
const dailyLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  developerId: { type: Number, ref: "Users", required: true, index: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  logDate: { type: String, required: true, index: true },
  // string Date YYYY-MM-DD
  workCategories: { type: [String], default: [], required: true },
  taskTitle: { type: String, required: true },
  taskDescription: { type: String },
  hoursSpent: { type: Number, required: true },
  // Number replaces PG Numeric
  completionPct: { type: Number, default: 0, required: true },
  blockers: { type: String },
  nextDayPlan: { type: String }
}, { timestamps: true });
dailyLogSchema.index({ projectId: 1, developerId: 1, logDate: -1 });
dailyLogSchema.index({ developerId: 1, logDate: -1 });
const DailyLogs = mongoose.models.DailyLogs || mongoose.model("DailyLogs", dailyLogSchema);
const dailyLogsTable = DailyLogs;
export {
  DailyLogs,
  dailyLogsTable
};
