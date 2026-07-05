import { companySettingsTable, getNextSequence } from "../models/schema/index.js";

const DEFAULT_REQUIRED_DAILY_HOURS = 7.5;
const DEFAULT_DAILY_LOG_REMINDER_HOUR = 23;

/** Sensitive-app screenshot blur is mandatory — not admin-configurable. */
export const SCREENSHOT_BLUR_ALWAYS_ENABLED = true;

// Settings are a singleton document that changes rarely (only when an admin
// explicitly updates them). Cache them in-process for 5 min to avoid a DB
// round-trip on every monitoring/consent/work-policy request.
const SETTINGS_CACHE_TTL_MS = 300_000;
let _settingsCache = null;
let _settingsCachedAt = 0;

export function invalidateSettingsCache() {
  _settingsCache = null;
  _settingsCachedAt = 0;
}

export function normalizeReminderHour(value) {
  const hour = Number.parseInt(value ?? DEFAULT_DAILY_LOG_REMINDER_HOUR, 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return DEFAULT_DAILY_LOG_REMINDER_HOUR;
  return hour;
}

export async function getOrCreateSettings() {
  const now = Date.now();
  if (_settingsCache && now - _settingsCachedAt < SETTINGS_CACHE_TTL_MS) {
    return _settingsCache;
  }

  const existing = await companySettingsTable.findOne();
  if (existing) {
    _settingsCache = existing;
    _settingsCachedAt = now;
    return existing;
  }

  const nextId = await getNextSequence("settings");
  const created = await companySettingsTable.create({
    id: nextId,
    companyName: "My Agency",
    requiredDailyWorkHours: DEFAULT_REQUIRED_DAILY_HOURS,
    dailyLogComplianceEnabled: true,
    dailyLogReminderHour: DEFAULT_DAILY_LOG_REMINDER_HOUR,
  });
  _settingsCache = created;
  _settingsCachedAt = now;
  return created;
}

export function formatSettings(settings) {
  return {
    id: settings.id,
    companyName: settings.companyName,
    logoUrl: settings.logoUrl ?? null,
    address: settings.address ?? null,
    sealUrl: settings.sealUrl ?? null,
    requiredDailyWorkHours: Number(settings.requiredDailyWorkHours ?? DEFAULT_REQUIRED_DAILY_HOURS),
    dailyLogComplianceEnabled: settings.dailyLogComplianceEnabled !== false,
    dailyLogReminderHour: normalizeReminderHour(settings.dailyLogReminderHour),
    complianceTimezone: settings.complianceTimezone?.trim() || null,
    screenshotEnabled: settings.screenshotEnabled ?? false,
    screenshotIntervalMinutes: settings.screenshotIntervalMinutes ?? 10,
    screenshotRetentionDays: settings.screenshotRetentionDays ?? 30,
    screenshotBlurEnabled: SCREENSHOT_BLUR_ALWAYS_ENABLED,
    screenshotConsentVersion: settings.screenshotConsentVersion ?? "1.0",
    hrmLeaveYearStartMonth: settings.hrmLeaveYearStartMonth ?? 1,
    hrmDefaultShiftTemplateId: settings.hrmDefaultShiftTemplateId ?? null,
    hrmAttendanceShortfallThresholdMinutes: settings.hrmAttendanceShortfallThresholdMinutes ?? 0,
    hrmWeekendDays: settings.hrmWeekendDays ?? [0, 6],
    hrmGlobalWfhMode: settings.hrmGlobalWfhMode ?? false,
    hrmPaidLeavesPerMonth: settings.hrmPaidLeavesPerMonth ?? 1,
    hrmLeaveResetCycleMonths: settings.hrmLeaveResetCycleMonths ?? 3,
    hrmMaxFreeLates: settings.hrmMaxFreeLates ?? 3,
    hrmElectronOnlyClock: settings.hrmElectronOnlyClock ?? false,
    hrmLeaveCarryForwardStartYear: settings.hrmLeaveCarryForwardStartYear ?? 2026,
    hrmOnboardingChecklistTemplate: Array.isArray(settings.hrmOnboardingChecklistTemplate)
      ? settings.hrmOnboardingChecklistTemplate.map((t) => String(t).trim()).filter(Boolean)
      : [],
    updatedAt: settings.updatedAt.toISOString()
  };
}

export async function getWorkPolicy() {
  const settings = await getOrCreateSettings();
  return {
    requiredDailyWorkHours: Number(settings.requiredDailyWorkHours ?? DEFAULT_REQUIRED_DAILY_HOURS),
    dailyLogComplianceEnabled: settings.dailyLogComplianceEnabled !== false,
    dailyLogReminderHour: normalizeReminderHour(settings.dailyLogReminderHour),
    complianceTimezone: settings.complianceTimezone?.trim() || null
  };
}
