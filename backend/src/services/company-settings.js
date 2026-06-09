import { companySettingsTable, getNextSequence } from "../models/schema/index.js";

const DEFAULT_REQUIRED_DAILY_HOURS = 7.5;
const DEFAULT_DAILY_LOG_REMINDER_HOUR = 23;

export function normalizeReminderHour(value) {
  const hour = Number.parseInt(value ?? DEFAULT_DAILY_LOG_REMINDER_HOUR, 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return DEFAULT_DAILY_LOG_REMINDER_HOUR;
  return hour;
}

export async function getOrCreateSettings() {
  const existing = await companySettingsTable.findOne();
  if (existing) return existing;
  const nextId = await getNextSequence("settings");
  return companySettingsTable.create({
    id: nextId,
    companyName: "My Agency",
    requiredDailyWorkHours: DEFAULT_REQUIRED_DAILY_HOURS,
    dailyLogComplianceEnabled: true,
    dailyLogReminderHour: DEFAULT_DAILY_LOG_REMINDER_HOUR
  });
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
