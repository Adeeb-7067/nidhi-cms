import { usersTable } from "../../../models/schema/index.js";
import { toIso } from "../../../utils/mongo-list.js";
import { softDeleteFields as sharedSoftDelete } from "../../../utils/soft-crud-factory.js";

export function dateOnly(value) {
  if (!value) return null;
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

export async function resolveUserName(userId) {
  if (!userId) return null;
  const user = await usersTable.findOne({ id: Number(userId) }, { id: 1, name: 1 }).lean();
  return user?.name ?? null;
}

export async function resolveUserNames(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(Number))];
  if (unique.length === 0) return new Map();
  const rows = await usersTable.find({ id: { $in: unique } }, { id: 1, name: 1 }).lean();
  return new Map(rows.map((u) => [u.id, u.name]));
}

export function softDeleteFields() {
  return sharedSoftDelete();
}
