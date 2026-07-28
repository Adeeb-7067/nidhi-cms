import { SalesPreferences } from "../schema/preferences.js";
import { badRequest } from "../../../utils/route-errors.js";
import { assertSalesAdmin } from "../../../utils/sales-admin-guard.js";
import { mergeDocumentBranding, normalizeCustomFields } from "../../../utils/sales-document-branding-defaults.js";

const DEFAULTS = {
  proposalPrefix: "PROP",
  proposalNextNumber: 1,
  defaultTax: 18,
  emailNotifications: true,
  pushNotifications: true,
  reminderHours: 24,
  overdueAlerts: true,
};

function formatSettingsResponse(prefs) {
  return {
    proposalPrefix: prefs.proposalPrefix ?? DEFAULTS.proposalPrefix,
    proposalNextNumber: prefs.proposalNextNumber ?? DEFAULTS.proposalNextNumber,
    defaultTax: prefs.defaultTax ?? DEFAULTS.defaultTax,
    emailNotifications: prefs.emailNotifications ?? DEFAULTS.emailNotifications,
    pushNotifications: prefs.pushNotifications ?? DEFAULTS.pushNotifications,
    reminderHours: prefs.reminderHours ?? DEFAULTS.reminderHours,
    overdueAlerts: prefs.overdueAlerts ?? DEFAULTS.overdueAlerts,
    documentBranding: mergeDocumentBranding(prefs.documentBranding),
    updatedAt: prefs.updatedAt?.toISOString?.() ?? null,
  };
}

async function getOrCreatePreferences() {
  let doc = await SalesPreferences.findOne({ id: 1 }).lean();
  if (!doc) {
    doc = (await SalesPreferences.create({ id: 1, ...DEFAULTS })).toObject();
  }
  return doc;
}

async function getSettings(_req, res) {
  const prefs = await getOrCreatePreferences();
  res.json(formatSettingsResponse(prefs));
}

function applyDocumentBrandingUpdates(body, updates, existing) {
  if (body.documentBranding === undefined) return;
  const src = body.documentBranding;
  if (!src || typeof src !== "object") {
    badRequest("documentBranding must be an object.", "documentBranding");
  }
  const base = mergeDocumentBranding(existing?.documentBranding);
  const next = { ...base };
  const stringFields = [
    "gstin",
    "email",
    "phone",
    "pan",
    "cin",
    "website",
    "bankName",
    "bankAccount",
    "bankIfsc",
  ];
  for (const key of stringFields) {
    if (src[key] !== undefined) {
      const value = src[key] == null ? null : String(src[key]).trim();
      next[key] = value || null;
    }
  }
  if (src.customFields !== undefined) {
    next.customFields = normalizeCustomFields(src.customFields);
  }
  updates.documentBranding = mergeDocumentBranding(next);
}

async function patchSettings(req, res) {
  assertSalesAdmin(req.user, "Only sales admins can change automation settings.");
  const body = req.body ?? {};
  const updates = { updatedBy: req.user.id };

  if (body.proposalPrefix !== undefined) {
    const prefix = String(body.proposalPrefix).trim();
    if (!prefix) badRequest("Proposal prefix cannot be empty.", "proposalPrefix");
    updates.proposalPrefix = prefix;
  }
  if (body.proposalNextNumber !== undefined) {
    const n = Number(body.proposalNextNumber);
    if (!Number.isFinite(n) || n < 1) badRequest("Next sequence must be at least 1.", "proposalNextNumber");
    updates.proposalNextNumber = Math.floor(n);
  }
  if (body.defaultTax !== undefined) {
    const tax = Number(body.defaultTax);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      badRequest("Tax rate must be between 0 and 100.", "defaultTax");
    }
    updates.defaultTax = tax;
  }
  if (body.emailNotifications !== undefined) updates.emailNotifications = Boolean(body.emailNotifications);
  if (body.pushNotifications !== undefined) updates.pushNotifications = Boolean(body.pushNotifications);
  if (body.reminderHours !== undefined) {
    const hours = Number(body.reminderHours);
    if (![1, 24, 48].includes(hours)) badRequest("Reminder hours must be 1, 24, or 48.", "reminderHours");
    updates.reminderHours = hours;
  }
  if (body.overdueAlerts !== undefined) updates.overdueAlerts = Boolean(body.overdueAlerts);

  const existing = await getOrCreatePreferences();
  applyDocumentBrandingUpdates(body, updates, existing);

  if (Object.keys(updates).length <= 1) badRequest("No settings to update.");

  await SalesPreferences.updateOne({ id: 1 }, { $set: updates }, { upsert: true });
  const prefs = await getOrCreatePreferences();
  res.json(formatSettingsResponse(prefs));
}

export { getSettings, patchSettings };
