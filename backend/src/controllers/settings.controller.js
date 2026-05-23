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

async function getSettings(req, res) {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
}

async function patchSettings(req, res) {
  const { companyName, logoUrl, address, sealUrl, requiredDailyWorkHours, dailyLogComplianceEnabled } =
    req.body;
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

  const updated = await companySettingsTable.findOneAndUpdate(
    { id: settings.id },
    { $set: update },
    { new: true }
  );
  res.json(formatSettings(updated));
}

export {
  getSettings,
  patchSettings
};
