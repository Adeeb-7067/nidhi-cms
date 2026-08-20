import { websiteRedirectsTable } from "../schema/WebsiteRedirect.js";

/**
 * Creates a 301/302 redirect rule with chain flattening and loop prevention.
 */
export async function createRedirectRule({
  fromPath,
  toPath,
  statusCode = 301,
  createdReason = "manual",
  userId,
}) {
  const cleanFrom = fromPath.toLowerCase().trim();
  const cleanTo = toPath.toLowerCase().trim();

  if (cleanFrom === cleanTo) {
    throw new Error("Source and target redirect paths cannot be identical.");
  }

  // Check direct loop condition (A -> B when B -> A exists)
  const reverseMatch = await websiteRedirectsTable.findOne({
    fromPath: cleanTo,
    isActive: true,
  });

  if (reverseMatch && reverseMatch.toPath === cleanFrom) {
    throw new Error(`Redirect loop detected between ${cleanFrom} and ${cleanTo}`);
  }

  // Flatten existing redirect chains (A -> B, B -> C => A -> C)
  await websiteRedirectsTable.updateMany(
    { toPath: cleanFrom, isActive: true },
    { $set: { toPath: cleanTo } }
  );

  return websiteRedirectsTable.findOneAndUpdate(
    { fromPath: cleanFrom },
    {
      toPath: cleanTo,
      statusCode,
      isActive: true,
      createdReason,
      createdBy: userId,
    },
    { upsert: true, new: true }
  );
}

/**
 * Resolves a requested URL path through redirect chains (max 5 hops).
 */
export async function resolveRedirectPath(requestedPath) {
  let currentPath = requestedPath.toLowerCase().trim();
  let hops = 0;
  let finalMatch = null;

  while (hops < 5) {
    const match = await websiteRedirectsTable.findOne({
      fromPath: currentPath,
      isActive: true,
    }).lean();

    if (!match) break;

    finalMatch = match;
    currentPath = match.toPath;
    hops++;
  }

  return finalMatch ? { toPath: currentPath, statusCode: finalMatch.statusCode } : null;
}
