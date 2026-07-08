import { usersTable } from "../models/schema/index.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
import { toIso } from "../utils/mongo-list.js";

async function formatAlertRows(rows) {
  const users = new IdLookupCache(async (ids) => {
    const rows2 = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows2;
  });
  await Promise.all([
    users.preload(rows.flatMap((a) => [a.targetUserId, a.createdBy])),
  ]);
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    photoUrl: a.photoUrl ?? null,
    scheduledAt: toIso(a.scheduledAt),
    audienceType: a.audienceType,
    targetUserId: a.targetUserId ?? null,
    targetUserName: a.targetUserId ? users.get(a.targetUserId)?.name ?? null : null,
    targetRole: a.targetRole ?? null,
    status: a.status,
    firedAt: toIso(a.firedAt),
    createdBy: a.createdBy,
    createdByName: users.get(a.createdBy)?.name ?? null,
    createdAt: toIso(a.createdAt),
    updatedAt: toIso(a.updatedAt),
  }));
}

async function formatAlertRow(row) {
  const [formatted] = await formatAlertRows([row]);
  return formatted;
}

export {
  formatAlertRow,
  formatAlertRows,
};
