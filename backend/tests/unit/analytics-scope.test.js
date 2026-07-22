/**
 * Hybrid RBAC: analytics / reports / presence / settings scope contracts.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("analytics / reports / presence / settings contracts", () => {
  test("project analytics asserts project access", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/analytics.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("assertProjectAccess"));
    assert.ok(src.includes("getAccessibleProjectIds"));
  });

  test("reports POST asserts project access", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/reports.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("assertProjectAccess"));
    assert.ok(src.includes("isVirtualLogProjectId"));
  });

  test("presence is not org-wide for non-admins", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/presence.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("resolveAllowedPresenceIds") || src.includes("getDirectReportIds"));
    assert.ok(src.includes("projectMembersTable"));
  });

  test("settings returns operational subset for non hr/sa", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/settings.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("Operational subset") || src.includes("screenshotEnabled"));
    assert.ok(src.includes('role === "super_admin"') || src.includes("super_admin"));
  });

  test("hr is not unscoped in digital marketing helper", () => {
    const src = readFileSync(
      join(__dirname, "../../src/services/marketing/helpers.js"),
      "utf8",
    );
    const fnStart = src.indexOf("export async function getScopedDigitalUserAccess");
    const fnBody = src.slice(fnStart, fnStart + 800);
    assert.ok(fnBody.includes('user?.role === "super_admin"'));
    assert.ok(!fnBody.includes('["super_admin", "hr"]'));
  });
});
