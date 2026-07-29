/**
 * Orphan bucket sweeping is intentionally disabled.
 *
 * A prior implementation listed the entire shared Spaces/S3 bucket and deleted
 * keys not referenced by CMS — which destroyed other projects' prefixes.
 *
 * Object deletes must go through deleteStoredFile() (CMS folder only).
 * Manual CMS-only audit: `node --env-file=.env ./scripts/find-orphaned-uploads.mjs`
 *
 * Do not restore automatic bucket-wide orphan deletion.
 */

async function runStorageCleanup() {
  // no-op
}

function startStorageCleanupJob() {
  return () => {};
}

export { runStorageCleanup, startStorageCleanupJob };
