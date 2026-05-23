import { companySettingsTable, getNextSequence } from "../models/schema/index.js";

const DEFAULT_REQUIRED_DAILY_HOURS = 7.5;

export async function getOrCreateSettings() {
  const existing = await companySettingsTable.findOne();
  if (existing) return existing;
  const nextId = await getNextSequence("settings");
  return companySettingsTable.create({
    id: nextId,
    companyName: "My Agency",
    requiredDailyWorkHours: DEFAULT_REQUIRED_DAILY_HOURS,
    dailyLogComplianceEnabled: true
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
    updatedAt: settings.updatedAt.toISOString()
  };
}

export async function getWorkPolicy() {
  const settings = await getOrCreateSettings();
  return {
    requiredDailyWorkHours: Number(settings.requiredDailyWorkHours ?? DEFAULT_REQUIRED_DAILY_HOURS),
    dailyLogComplianceEnabled: settings.dailyLogComplianceEnabled !== false
  };
}
