import { getNextSequence, AdminMediaItems } from "../../../models/schema/index.js";
import { mediaFolderSeedKey } from "../../../constants/marketing.js";

export const DEFAULT_ADMIN_MEDIA_SUBFOLDERS = [
  "Documents",
  "Images",
  "Videos",
  "Templates",
  "Policies",
  "Archive",
];

/**
 * Idempotent org vault: root "Company storage" + default subfolders.
 * Default folders are tracked by seedKey so display-name renames stick.
 */
export async function ensureAdminMediaVault(userId) {
  let root = await AdminMediaItems.findOne({
    parentId: null,
    kind: "folder",
    isDeleted: false,
  });

  if (!root) {
    const rootId = await getNextSequence("admin_media");
    root = await AdminMediaItems.create({
      id: rootId,
      parentId: null,
      name: "Company storage",
      seedKey: "root",
      kind: "folder",
      createdBy: userId,
    });
  } else if (!root.seedKey) {
    root.seedKey = "root";
    await root.save();
  }

  const rootId = root.id;
  const existingSubs = await AdminMediaItems.find({
    parentId: rootId,
    kind: "folder",
    isDeleted: false,
  })
    .select({ id: 1, name: 1, seedKey: 1 })
    .lean();

  const haveByKey = new Set(existingSubs.map((f) => f.seedKey).filter(Boolean));
  const byName = new Map(existingSubs.map((f) => [f.name, f]));

  for (const name of DEFAULT_ADMIN_MEDIA_SUBFOLDERS) {
    const seedKey = mediaFolderSeedKey(name);
    if (haveByKey.has(seedKey)) continue;

    const legacy = byName.get(name);
    if (legacy) {
      await AdminMediaItems.updateOne({ id: legacy.id }, { $set: { seedKey } });
      haveByKey.add(seedKey);
      continue;
    }

    const id = await getNextSequence("admin_media");
    await AdminMediaItems.create({
      id,
      parentId: rootId,
      name,
      seedKey,
      kind: "folder",
      createdBy: userId,
    });
    haveByKey.add(seedKey);
  }

  return root;
}
