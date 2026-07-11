import { usersTable } from "../models/schema/index.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
import { toIso } from "../utils/mongo-list.js";

async function formatWarningRows(rows) {
  const users = new IdLookupCache(async (ids) => {
    return usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
  });
  await users.preload(rows.flatMap((w) => [w.targetUserId, w.createdBy]));
  return rows.map((w) => ({
    id: w.id,
    targetUserId: w.targetUserId,
    targetUserName: w.targetUserId ? users.get(w.targetUserId)?.name ?? null : null,
    title: w.title,
    description: w.description,
    startDate: toIso(w.startDate),
    endDate: toIso(w.endDate),
    status: w.status,
    createdBy: w.createdBy,
    createdByName: users.get(w.createdBy)?.name ?? null,
    createdAt: toIso(w.createdAt),
    updatedAt: toIso(w.updatedAt),
  }));
}

async function formatWarningRow(row) {
  const [formatted] = await formatWarningRows([row]);
  return formatted;
}

export {
  formatWarningRow,
  formatWarningRows,
};
