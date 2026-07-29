import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  extractAccessToken,
  formatScreenshot,
  guessImageContentType,
  PRIVATE_SCREENSHOT_URL_PREFIX,
  resolveScreenshotFileRef,
} from "../../src/modules/monitoring/services/screenshot-content.js";

describe("screenshot-content helpers", () => {
  let previousFolderPath;

  beforeEach(() => {
    previousFolderPath = process.env.BUCKET_FOLDER_PATH;
    process.env.BUCKET_FOLDER_PATH = "ClientManagement-CMS/";
  });

  afterEach(() => {
    if (previousFolderPath === undefined) delete process.env.BUCKET_FOLDER_PATH;
    else process.env.BUCKET_FOLDER_PATH = previousFolderPath;
  });

  test("extractAccessToken reads Bearer and X-Access-Token", () => {
    assert.equal(
      extractAccessToken({ headers: { authorization: "Bearer abc.def" } }),
      "abc.def",
    );
    assert.equal(
      extractAccessToken({ headers: { "x-access-token": "xyz" } }),
      "xyz",
    );
    assert.equal(extractAccessToken({ headers: {} }), "");
  });

  test("formatScreenshot builds proxy URL and never returns raw storage paths", () => {
    const doc = {
      id: 42,
      userId: 7,
      sessionId: 9,
      projectId: null,
      fileUrl: "https://bucket.sgp1.digitaloceanspaces.com/ClientManagement-CMS/screenshots/a.png",
      fileSize: 100,
      takenAt: new Date("2026-07-28T10:00:00.000Z"),
    };
    const req = {
      protocol: "https",
      get: () => "api.example.com",
      headers: { authorization: "Bearer tok123" },
    };
    const dto = formatScreenshot(doc, req);
    assert.equal(dto.id, 42);
    assert.equal(dto.fileUrl, "https://api.example.com/api/screenshots/42/content?token=tok123");
    assert.ok(!dto.fileUrl.includes("digitaloceanspaces"));
    assert.ok(!dto.fileUrl.includes("/uploads/"));
  });

  test("formatScreenshot returns null fileUrl without token", () => {
    const dto = formatScreenshot(
      { id: 1, userId: 1, fileUrl: "/private/screenshots/x.png", takenAt: new Date() },
      { protocol: "http", get: () => "localhost:8080", headers: {} },
    );
    assert.equal(dto.fileUrl, null);
  });

  test("guessImageContentType maps extensions", () => {
    assert.equal(guessImageContentType("a.PNG"), "image/png");
    assert.equal(guessImageContentType("shot.jpeg"), "image/jpeg");
    assert.equal(guessImageContentType("shot.jpg"), "image/jpeg");
    assert.equal(guessImageContentType("noext"), "image/png");
  });

  test("resolveScreenshotFileRef accepts CMS object keys and rejects foreign prefixes", () => {
    const ok = resolveScreenshotFileRef(
      "https://bucket.sgp1.digitaloceanspaces.com/ClientManagement-CMS/screenshots/a%20b.png",
    );
    assert.equal(ok.ok, true);
    assert.equal(ok.kind, "object");
    assert.equal(ok.key, "ClientManagement-CMS/screenshots/a b.png");

    const bad = resolveScreenshotFileRef(
      "https://bucket.sgp1.digitaloceanspaces.com/OtherProject/screenshots/a.png",
    );
    assert.equal(bad.ok, false);
  });

  test("resolveScreenshotFileRef supports private local and legacy uploads paths", () => {
    const priv = resolveScreenshotFileRef(`${PRIVATE_SCREENSHOT_URL_PREFIX}123-ab-shot.png`);
    assert.deepEqual(priv, {
      ok: true,
      kind: "private-local",
      relativePath: "123-ab-shot.png",
    });

    const legacy = resolveScreenshotFileRef("/uploads/old-shot.png");
    assert.deepEqual(legacy, {
      ok: true,
      kind: "legacy-uploads",
      relativePath: "old-shot.png",
    });

    assert.equal(resolveScreenshotFileRef("/private/screenshots/../etc/passwd").ok, false);
    assert.equal(resolveScreenshotFileRef("/uploads/../../secret").ok, false);
  });
});

describe("screenshot magic-byte validation", () => {
  test("uploadScreenshot rejects non-image buffers", async () => {
    const { uploadScreenshot } = await import(
      "../../src/modules/monitoring/services/screenshots.service.js"
    );
    await assert.rejects(
      () =>
        uploadScreenshot({
          buffer: Buffer.from("not-an-image"),
          originalName: "x.txt",
          mimetype: "text/plain",
          userId: 1,
        }),
      (err) => err?.status === 400 || err?.statusCode === 400 || /PNG or JPEG/i.test(String(err?.message)),
    );
  });
});
