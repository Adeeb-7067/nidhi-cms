import { Router } from "express";
import { db } from "../lib/db";
import { companySettingsTable } from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

async function getOrCreateSettings() {
  const existing = await db.query.companySettingsTable.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(companySettingsTable).values({ companyName: "My Agency" }).returning();
  return created;
}

// GET /api/settings
router.get("/settings", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
});

// PATCH /api/settings
router.patch("/settings", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { companyName, logoUrl, address, sealUrl } = req.body;
  const settings = await getOrCreateSettings();
  const { eq } = await import("drizzle-orm");
  const [updated] = await db
    .update(companySettingsTable)
    .set({ companyName, logoUrl, address, sealUrl, updatedAt: new Date() })
    .where(eq(companySettingsTable.id, settings.id))
    .returning();
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

export default router;
