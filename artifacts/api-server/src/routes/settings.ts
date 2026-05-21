import { Router } from "express";
import { companySettingsTable, getNextSequence } from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

async function getOrCreateSettings() {
  const existing = await companySettingsTable.findOne();
  if (existing) return existing;
  
  const nextId = await getNextSequence("settings");
  const created = await companySettingsTable.create({
    id: nextId,
    companyName: "My Agency"
  });
  return created;
}

// GET /api/settings
router.get("/settings", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({
    id: settings.id,
    companyName: settings.companyName,
    logoUrl: settings.logoUrl,
    address: settings.address,
    sealUrl: settings.sealUrl,
    updatedAt: settings.updatedAt.toISOString()
  });
});

// PATCH /api/settings
router.patch("/settings", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { companyName, logoUrl, address, sealUrl } = req.body;
  const settings = await getOrCreateSettings();
  
  const updated = await companySettingsTable.findOneAndUpdate(
    { id: settings.id },
    { $set: { companyName, logoUrl, address, sealUrl } },
    { new: true }
  );
  
  res.json({
    id: updated!.id,
    companyName: updated!.companyName,
    logoUrl: updated!.logoUrl,
    address: updated!.address,
    sealUrl: updated!.sealUrl,
    updatedAt: updated!.updatedAt.toISOString()
  });
});

export default router;
