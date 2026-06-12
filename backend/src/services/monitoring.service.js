import { monitoringConsentsTable, getNextSequence } from "../models/schema/index.js";
import { getOrCreateSettings } from "./company-settings.js";

export async function getConsentStatus(userId) {
  const [consent, settings] = await Promise.all([
    monitoringConsentsTable.findOne({ userId }).lean(),
    getOrCreateSettings(),
  ]);

  const hasConsented = !!consent?.consentGivenAt;
  const isCurrentVersion = consent?.consentVersion === settings.screenshotConsentVersion;

  return {
    hasConsented,
    isCurrentVersion,
    consentVersion: settings.screenshotConsentVersion,
    consentGivenAt: consent?.consentGivenAt ?? null,
    needsRenewal: hasConsented && !isCurrentVersion
  };
}

export async function recordConsent({ userId, ipAddress, userAgent }) {
  const settings = await getOrCreateSettings();
  const existing = await monitoringConsentsTable.findOne({ userId });

  if (existing) {
    // GDPR Article 7: preserve full consent history before overwriting current record.
    if (existing.consentGivenAt) {
      existing.history.push({
        consentGivenAt: existing.consentGivenAt,
        consentVersion: existing.consentVersion,
        ipAddress: existing.ipAddress,
        userAgent: existing.userAgent,
      });
    }
    existing.consentGivenAt = new Date();
    existing.consentVersion = settings.screenshotConsentVersion;
    existing.ipAddress = ipAddress ?? null;
    existing.userAgent = userAgent ?? null;
    await existing.save();
    return existing;
  }

  const id = await getNextSequence("monitoringConsent");
  return monitoringConsentsTable.create({
 id,
    userId,
    consentGivenAt: new Date(),
    consentVersion: settings.screenshotConsentVersion,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    history: [],
  });
}

export async function getMonitoringStatus() {
  const settings = await getOrCreateSettings();
  return {
    screenshotEnabled: settings.screenshotEnabled,
    screenshotIntervalMinutes: settings.screenshotIntervalMinutes,
    screenshotRetentionDays: settings.screenshotRetentionDays,
    screenshotBlurEnabled: settings.screenshotBlurEnabled,
    screenshotConsentVersion: settings.screenshotConsentVersion
  }; 
}

export async function listAllConsents({ page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    monitoringConsentsTable.find({}).sort({ consentGivenAt: -1 }).skip(skip).limit(limit).lean(),
    monitoringConsentsTable.countDocuments({}),
  ]);
  return { items, total, page, limit };
}

