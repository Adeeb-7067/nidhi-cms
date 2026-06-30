import { SalesPreferences } from "../../models/schema/sales/preferences.js";
import { badRequest } from "../../utils/route-errors.js";

const DEFAULTS = {
  proposalPrefix: "PROP",
  proposalNextNumber: 1,
  defaultTax: 18,
  emailNotifications: true,
  pushNotifications: true,
  reminderHours: 24,
  overdueAlerts: true,
};

async function getOrCreatePreferences() {
  let doc = await SalesPreferences.findOne({ id: 1 }).lean();
  if (!doc) {
    doc = (await SalesPreferences.create({ id: 1, ...DEFAULTS })).toObject();
  }
  return doc;
}

async function getSettings(_req, res) {
  const prefs = await getOrCreatePreferences();
  res.json({
    proposalPrefix: prefs.proposalPrefix ?? DEFAULTS.proposalPrefix,
    proposalNextNumber: prefs.proposalNextNumber ?? DEFAULTS.proposalNextNumber,
    defaultTax: prefs.defaultTax ?? DEFAULTS.defaultTax,
    emailNotifications: prefs.emailNotifications ?? DEFAULTS.emailNotifications,
    pushNotifications: prefs.pushNotifications ?? DEFAULTS.pushNotifications,
    reminderHours: prefs.reminderHours ?? DEFAULTS.reminderHours,
    overdueAlerts: prefs.overdueAlerts ?? DEFAULTS.overdueAlerts,
    updatedAt: prefs.updatedAt?.toISOString?.() ?? null,
  });
}

async function patchSettings(req, res) {
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

  if (Object.keys(updates).length <= 1) badRequest("No settings to update.");

  await SalesPreferences.updateOne({ id: 1 }, { $set: updates }, { upsert: true });
  const prefs = await getOrCreatePreferences();
  res.json({
    proposalPrefix: prefs.proposalPrefix,
    proposalNextNumber: prefs.proposalNextNumber,
    defaultTax: prefs.defaultTax,
    emailNotifications: prefs.emailNotifications,
    pushNotifications: prefs.pushNotifications,
    reminderHours: prefs.reminderHours,
    overdueAlerts: prefs.overdueAlerts,
    updatedAt: prefs.updatedAt?.toISOString?.() ?? null,
  });
}

export { getSettings, patchSettings };
