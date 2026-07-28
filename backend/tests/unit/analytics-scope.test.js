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
      join(__dirname, "../../src/modules/crm/controllers/analytics.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("assertProjectAccess"));
    assert.ok(src.includes("getAccessibleProjectIds"));
  });

  test("reports POST asserts project access", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/work/controllers/reports.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("assertProjectAccess"));
    assert.ok(src.includes("isVirtualLogProjectId"));
  });

  test("presence is not org-wide for non-admins", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/monitoring/controllers/presence.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("resolveAllowedPresenceIds") || src.includes("getDirectReportIds"));
    assert.ok(src.includes("projectMembersTable"));
  });

  test("settings returns operational subset for non hr/sa", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/settings/controllers/settings.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("Operational subset") || src.includes("screenshotEnabled"));
    assert.ok(src.includes('role === "super_admin"') || src.includes("super_admin"));
  });

  test("hr is not unscoped in digital marketing helper", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/marketing/services/helpers.js"),
      "utf8",
    );
    const fnStart = src.indexOf("export async function getScopedDigitalUserAccess");
    const fnBody = src.slice(fnStart, fnStart + 1200);
    assert.ok(fnBody.includes('user?.role === "super_admin"'));
    assert.ok(!fnBody.includes('["super_admin", "hr"]'));
    assert.ok(
      !fnBody.includes("needsScope"),
      "non–super-admin roles must not early-return unscoped via needsScope",
    );
  });

  test("manager is membership-scoped for marketing (not org-wide)", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/marketing/services/helpers.js"),
      "utf8",
    );
    const fnStart = src.indexOf("export async function getScopedDigitalUserAccess");
    const fnBody = src.slice(fnStart, fnStart + 1200);
    assert.ok(fnBody.includes('user?.role === "super_admin"'));
    assert.ok(fnBody.includes("digitalOnly"));
    assert.ok(
      !fnBody.includes('user?.role === "manager"') || !fnBody.includes("isScoped: false"),
      "manager must not have a dedicated unscoped early return",
    );
    // Only SA returns isScoped: false inside this function
    const unscopedReturns = (fnBody.match(/isScoped:\s*false/g) || []).length;
    assert.equal(unscopedReturns, 1, "only super_admin should return isScoped: false");
  });
});