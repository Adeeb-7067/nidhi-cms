import mongoose, { Schema } from "mongoose";
const employeeScreenshotSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  sessionId: { type: Number, ref: "WorkSessions", default: null, index: true },
  projectId: { type: Number, ref: "Projects", default: null },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number },
  takenAt: { type: Date, default: Date.now, index: true }
});

// Compound index for the date-range screenshot query (GET /api/screenshots?startDate&endDate)
employeeScreenshotSchema.index({ userId: 1, takenAt: 1 });
// Index for project-scoped screenshot queries
employeeScreenshotSchema.index({ projectId: 1, takenAt: -1 });

const EmployeeScreenshot = mongoose.models.EmployeeScreenshot || mongoose.model("EmployeeScreenshot", employeeScreenshotSchema);
const employeeScreenshotsTable = EmployeeScreenshot;
export {
  EmployeeScreenshot,
  employeeScreenshotsTable
};
