import { getNextSequence } from "../../../models/schema/index.js";
import { LegalCounsel } from "../schema/counsel.js";
import { badRequest } from "../../../utils/route-errors.js";
import { formatCounsel } from "./helpers.js";
import { requireNumber } from "./crud-factory.js";

/**
 * Resolve counsel by id into the embedded snapshot shape used on matters.
 * Accepts either assignedToId or assignedTo: { id }.
 */
export async function resolveCounselSnapshot(body, field = "assignedToId") {
  const rawId = body?.assignedToId ?? body?.assignedTo?.id ?? body?.ownerId ?? body?.owner?.id;
  const id = requireNumber(rawId, field, { min: 1 });
  const doc = await LegalCounsel.findOne({ id, isDeleted: false }).lean();
  if (!doc) badRequest("Counsel not found.", field);
  return formatCounsel(doc);
}

export async function nextRefNumber(sequenceKey, prefix) {
  const n = await getNextSequence(sequenceKey);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}
