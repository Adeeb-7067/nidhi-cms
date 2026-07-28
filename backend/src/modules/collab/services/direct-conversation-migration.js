import { directConversationsTable } from "../schema/direct-conversations.js";
import { buildDirectConversationPairKey, normalizeParticipantPair } from "./direct-conversations.js";
import { logger } from "../../../lib/logger.js";

let migrationPromise = null;
let badIndexDropped = false;

/**
 * MongoDB unique indexes on array fields enforce uniqueness per element, not per pair.
 * That incorrectly allowed only one conversation per admin. Migrate to pairKey + drop bad index.
 */
export async function migrateDirectConversationIndexes() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const collection = directConversationsTable.collection;
    const rows = await directConversationsTable.find({}).lean().exec();

    for (const row of rows) {
      const pair = normalizeParticipantPair(row.participantIds?.[0], row.participantIds?.[1]);
      if (!pair) continue;
      const pairKey = buildDirectConversationPairKey(pair);
      const needsPairKey = row.pairKey !== pairKey;
      const needsSort =
        row.participantIds?.[0] !== pair[0] || row.participantIds?.[1] !== pair[1];
      if (!needsPairKey && !needsSort) continue;
      await directConversationsTable.updateOne(
        { id: row.id },
        { $set: { pairKey, participantIds: pair } },
      );
    }

    await dropLegacyParticipantIdsUniqueIndex();

    await directConversationsTable.syncIndexes();
    logger.info("Direct conversation pairKey migration complete");
  })().catch((err) => {
    migrationPromise = null;
    logger.error({ err }, "Direct conversation migration failed");
    throw err;
  });

  return migrationPromise;
}

/**
 * Drops any unique index on the `participantIds` array column. Idempotent and safe to
 * call from the create path so the very first conflicting POST self-heals without a restart.
 */
export async function dropLegacyParticipantIdsUniqueIndex() {
  if (badIndexDropped) return false;
  const collection = directConversationsTable.collection;
  let dropped = false;
  try {
    const indexes = await collection.indexes();
    for (const index of indexes) {
      const onlyParticipantIds =
        index.key &&
        Object.keys(index.key).length === 1 &&
        index.key.participantIds === 1;
      if (onlyParticipantIds && index.unique && index.name) {
        await collection.dropIndex(index.name);
        logger.warn(
          { index: index.name },
          "Dropped invalid unique index on participantIds array (legacy schema)",
        );
        dropped = true;
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to drop legacy participantIds unique index");
    return false;
  }
  badIndexDropped = true;
  return dropped;
}

export function resetLegacyIndexCache() {
  badIndexDropped = false;
}
