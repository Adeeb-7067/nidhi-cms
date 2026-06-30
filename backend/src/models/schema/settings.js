import mongoose, { Schema } from "mongoose";
const companySettingsSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyName: { type: String, default: "My Agency", required: true },
  logoUrl: { type: String },
  address: { type: String },   
  sealUrl: { type: String },
  requiredDailyWorkHours: { type: Number, default: 7.5, min: 1, max: 16 },
  dailyLogComplianceEnabled: { type: Boolean, default: true },
  /** 0–23 local hour for incomplete daily-log reminders (default 23 = 11:00 PM). */
  dailyLogReminderHour: { type: Number, default: 23, min: 0, max: 23 },
  /** IANA timezone (e.g. Asia/Kolkata). Falls back to COMPLIANCE_TIMEZONE env, then UTC. */
  complianceTimezone: { type: String, default: null },
  screenshotEnabled: { type: Boolean, default: false },
  screenshotIntervalMinutes: { type: Number, default: 10, min: 1, max: 60 },
  screenshotRetentionDays: { type: Number, default: 30 },
  screenshotBlurEnabled: { type: Boolean, default: true },
  screenshotConsentVersion: { type: String, default: "1.0" },
  hrmLeaveYearStartMonth: { type: Number, default: 1, min: 1, max: 12 },
  hrmDefaultShiftTemplateId: { type: Number, default: null },
  hrmAttendanceShortfallThresholdMinutes: { type: Number, default: 0, min: 0 },
  hrmWeekendDays: { type: [Number], default: [0, 6] },
  hrmGlobalWfhMode: { type: Boolean, default: false },
  hrmPaidLeavesPerMonth: { type: Number, default: 1, min: 0 },
  hrmMaxFreeLates: { type: Number, default: 3, min: 0 },
  hrmElectronOnlyClock: { type: Boolean, default: false },
  hrmLeaveCarryForwardStartYear: { type: Number, default: 2026 },
  /** Custom onboarding checklist titles (falls back to DEFAULT_ONBOARDING_TASKS when empty). */
  hrmOnboardingChecklistTemplate: { type: [String], default: [] },
}, { timestamps: { createdAt: false, updatedAt: true } });
const CompanySettings = mongoose.models.CompanySettings || mongoose.model("CompanySettings", companySettingsSchema);
const companySettingsTable = CompanySettings;
export {
  CompanySettings,
  companySettingsTable
};
