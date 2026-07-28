import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const authControllerPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/modules/identity/controllers/auth.controller.js",
);

describe("auth.controller imports", () => {
  test("patchAuthMe imports validateStoredFileUrl", () => {
    const src = fs.readFileSync(authControllerPath, "utf8");
    assert.match(
      src,
      /import\s*\{[^}]*\bvalidateStoredFileUrl\b[^}]*\}\s*from\s*["'](?:\.\.\/)+lib\/file-storage\.js["']/,
      "validateStoredFileUrl must be imported from file-storage.js",
    );
    assert.match(src, /\bvalidateStoredFileUrl\s*\(/, "patchAuthMe uses validateStoredFileUrl");
  });

  test("auth.controller module loads without ReferenceError", async () => {
    const mod = await import("../../src/modules/identity/controllers/auth.controller.js");
    assert.equal(typeof mod.patchAuthMe, "function");
  });
});
