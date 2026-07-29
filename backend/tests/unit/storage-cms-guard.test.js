import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getBucketFolderPrefix,
  isCmsObjectKey,
  objectKeyFromStoredRef,
} from "../../src/lib/object-storage.js";
import {
  runStorageCleanup,
  startStorageCleanupJob,
} from "../../src/modules/finance/services/storage-cleanup-job.js";

describe("object-storage CMS folder guards", () => {
  let previousFolderPath;

  beforeEach(() => {
    previousFolderPath = process.env.BUCKET_FOLDER_PATH;
    process.env.BUCKET_FOLDER_PATH = "ClientManagement-CMS/";
  });

  afterEach(() => {
    if (previousFolderPath === undefined) delete process.env.BUCKET_FOLDER_PATH;
    else process.env.BUCKET_FOLDER_PATH = previousFolderPath;
  });

  test("getBucketFolderPrefix reads BUCKET_FOLDER_PATH with trailing slash", () => {
    assert.equal(getBucketFolderPrefix(), "ClientManagement-CMS/");
    process.env.BUCKET_FOLDER_PATH = "ClientManagement-CMS";
    assert.equal(getBucketFolderPrefix(), "ClientManagement-CMS/");
  });

  test("empty BUCKET_FOLDER_PATH falls back to ClientManagement-CMS/", () => {
    process.env.BUCKET_FOLDER_PATH = "";
    assert.equal(getBucketFolderPrefix(), "ClientManagement-CMS/");
    process.env.BUCKET_FOLDER_PATH = "/";
    assert.equal(getBucketFolderPrefix(), "ClientManagement-CMS/");
  });

  test("isCmsObjectKey allows only keys under the CMS prefix", () => {
    assert.equal(isCmsObjectKey("ClientManagement-CMS/avatars/a.png"), true);
    assert.equal(isCmsObjectKey("ClientManagement-CMS/marketing/x.pdf"), true);
    assert.equal(isCmsObjectKey("OtherProject/data.csv"), false);
    assert.equal(isCmsObjectKey("HRM/files/a.png"), false);
    assert.equal(isCmsObjectKey("ClientManagement-CMS-backup/x"), false);
    assert.equal(isCmsObjectKey("ClientManagement-CMS/../OtherProject/x"), false);
    assert.equal(isCmsObjectKey(""), false);
    assert.equal(isCmsObjectKey(null), false);
  });

  test("objectKeyFromStoredRef parses URLs, uploads paths, and raw keys", () => {
    assert.equal(
      objectKeyFromStoredRef("https://bucket.sgp1.digitaloceanspaces.com/ClientManagement-CMS/a.png"),
      "ClientManagement-CMS/a.png",
    );
    assert.equal(objectKeyFromStoredRef("ClientManagement-CMS/a.png"), "ClientManagement-CMS/a.png");
    assert.equal(objectKeyFromStoredRef("/uploads/local.png"), "local.png");
    assert.equal(objectKeyFromStoredRef(""), null);
    assert.equal(objectKeyFromStoredRef(null), null);
  });
});

describe("storage orphan cleanup", () => {
  test("runStorageCleanup and startStorageCleanupJob are safe no-ops", async () => {
    await runStorageCleanup();
    const tick = startStorageCleanupJob();
    assert.equal(typeof tick, "function");
    tick();
  });
});
