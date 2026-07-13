import { usersTable } from "../models/schema/index.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
import { toIso } from "../utils/mongo-list.js";

async function formatAlertRows(rows) {
  const users = new IdLookupCache(async (ids) => {
    const rows2 = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows2;
  });
  await Promise.all([
    users.preload(
      rows.flatMap((a) => [a.targetUserId, a.createdBy, ...(a.targetUserIds ?? [])]),
    ),
  ]);
  return rows.map((a) => {
    // Normalize to arrays, falling back to legacy single-target fields.
    const targetUserIds = a.targetUserIds?.length
      ? a.targetUserIds
      : a.targetUserId != null
        ? [a.targetUserId]
        : [];
    const targetRoles = a.targetRoles?.length
      ? a.targetRoles
      : a.targetRole
        ? [a.targetRole]
        : [];
    const targetUserNames = targetUserIds.map((id) => users.get(id)?.name ?? `#${id}`);
    return {
    id: a.id,
    title: a.title,
    description: a.description,
    photoUrl: a.photoUrl ?? null,
    scheduledAt: toIso(a.scheduledAt),
    audienceType: a.audienceType,
    targetUserId: targetUserIds[0] ?? null,
    targetUserName: targetUserIds[0] != null ? users.get(targetUserIds[0])?.name ?? null : null,
    targetRole: targetRoles[0] ?? null,
    targetUserIds,
    targetRoles,
    targetUserNames,
    status: a.status,
    firedAt: toIso(a.firedAt),
    createdBy: a.createdBy,
    createdByName: users.get(a.createdBy)?.name ?? null,
    createdAt: toIso(a.createdAt),
    updatedAt: toIso(a.updatedAt),
    };
  });
}

async function formatAlertRow(row) {
  const [formatted] = await formatAlertRows([row]);
  return formatted;
}

export {
  formatAlertRow,
  formatAlertRows,
};
