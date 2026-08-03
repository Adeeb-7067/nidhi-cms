/**
 * Super Admin Delivery workspace must be org-wide, not membership-scoped.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(__dirname, "../../src/modules/platform/services/workspace-dashboard.js"),
  "utf8",
);

describe("workspace dashboard org-admin contracts", () => {
  test("super_admin scopes projects via distinct(id), not memberships", () => {
    assert.ok(src.includes('role === "super_admin"'), "super_admin branch required");
    assert.ok(src.includes('projectsTable.distinct("id")'), "org-wide project ids required");
    assert.ok(
      src.includes("isOrgAdmin"),
      "org-admin flag required for pending requests / bug trends",
    );
  });

  test("pipeline uses uncapped project set; recent list is limited", () => {
    assert.ok(src.includes("pipelineProjects"), "full pipeline projection required");
    assert.ok(src.includes(".limit(8)"), "recent projects capped at 8");
    assert.ok(src.includes("openRequests"), "pending requests KPI for admin");
  });
});
