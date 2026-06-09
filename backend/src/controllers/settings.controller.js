import { companySettingsTable } from "../models/schema/index.js";
import {
  getOrCreateSettings,
  formatSettings
} from "../services/company-settings.js";
import { badRequest } from "../utils/route-errors.js";

function parseRequiredDailyHours(value) {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1 || num > 16) {
    badRequest("requiredDailyWorkHours must be between 1 and 16.", "requiredDailyWorkHours");
  }
  return Math.round(num * 2) / 2;
}

function parseReminderHour(value) {
  if (value === undefined || value === null) return undefined;
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    badRequest("dailyLogReminderHour must be an integer between 0 and 23.", "dailyLogReminderHour");
  }
  return hour;
}

function parseComplianceTimezone(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const tz = String(value).trim();
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    badRequest("complianceTimezone must be a valid IANA timezone.", "complianceTimezone");
  }
  return tz;
}

async function getSettings(req, res) {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
}

async function patchSettings(req, res) {
  const {
    companyName,
    logoUrl,
    address,
    sealUrl,
    requiredDailyWorkHours,
    dailyLogComplianceEnabled,
    dailyLogReminderHour,
    complianceTimezone
  } = req.body;
  const settings = await getOrCreateSettings();
  const update = {};
  if (companyName !== undefined) update.companyName = companyName;
  if (logoUrl !== undefined) update.logoUrl = logoUrl;
  if (address !== undefined) update.address = address;
  if (sealUrl !== undefined) update.sealUrl = sealUrl;
  if (requiredDailyWorkHours !== undefined) {
    update.requiredDailyWorkHours = parseRequiredDailyHours(requiredDailyWorkHours);
  }
  if (dailyLogComplianceEnabled !== undefined) {
    update.dailyLogComplianceEnabled = Boolean(dailyLogComplianceEnabled);
  }
  if (dailyLogReminderHour !== undefined) {
    update.dailyLogReminderHour = parseReminderHour(dailyLogReminderHour);
  }
  if (complianceTimezone !== undefined) {
    update.complianceTimezone = parseComplianceTimezone(complianceTimezone);
  }

  const updated = await companySettingsTable.findOneAndUpdate(
    { id: settings.id },
    { $set: update },
    { new: true }
  );
  if (!updated) {
    badRequest("Settings could not be updated.", "settings");
  }
  res.json(formatSettings(updated));
}

export {
  getSettings,
  patchSettings
};
