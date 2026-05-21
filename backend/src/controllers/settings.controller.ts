import type { Request, Response } from "express";
﻿import { companySettingsTable, getNextSequence } from "@/models/schema";

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
export async function getSettings(req: Request, res: Response) {
  const settings = await getOrCreateSettings();
  res.json({
    id: settings.id,
    companyName: settings.companyName,
    logoUrl: settings.logoUrl,
    address: settings.address,
    sealUrl: settings.sealUrl,
    updatedAt: settings.updatedAt.toISOString()
  });
}


// PATCH /api/settings
export async function patchSettings(req: Request, res: Response) {
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
}

