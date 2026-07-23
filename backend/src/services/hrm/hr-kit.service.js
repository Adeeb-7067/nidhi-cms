import {
  hrmHrKitsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound } from "../../utils/route-errors.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";

export async function listHrKits() {
  return hrmHrKitsTable.find({ isActive: true }).sort({ title: 1 }).lean();
}

export async function createHrKit(body) {
  if (!body.title?.trim()) badRequest("HR Kit item title is required.");
  if (body.fileUrl) validateStoredFileUrl(body.fileUrl, "fileUrl");
  const id = await getNextSequence("hrm_hr_kits");
  return hrmHrKitsTable.create({
    id,
    title: body.title.trim(),
    description: body.description ?? null,
    category: body.category?.trim() || "General",
    fileUrl: body.fileUrl ?? null,
    version: body.version ?? "1.0",
    isActive: true,
  });
}

export async function updateHrKit(id, body) {
  const patch = {};
  if (body.title !== undefined) {
    if (!body.title?.trim()) badRequest("HR Kit item title is required.");
    patch.title = body.title.trim();
  }
  if (body.description !== undefined) patch.description = body.description ?? null;
  if (body.category !== undefined) patch.category = body.category?.trim() || "General";
  if (body.version !== undefined) patch.version = body.version ?? "1.0";
  if (body.fileUrl !== undefined) {
    if (body.fileUrl) validateStoredFileUrl(body.fileUrl, "fileUrl");
    patch.fileUrl = body.fileUrl || null;
  }
  const kit = await hrmHrKitsTable.findOneAndUpdate({ id, isActive: true }, { $set: patch }, { new: true });
  if (!kit) notFound("HR Kit item");
  return kit;
}

export async function deleteHrKit(id) {
  const kit = await hrmHrKitsTable.findOneAndUpdate(
    { id, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  );
  if (!kit) notFound("HR Kit item");
}
