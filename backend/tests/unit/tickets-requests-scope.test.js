/**
 * Hybrid RBAC: tickets + requests must not leak org-wide to finance/bde/digital.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("tickets / requests scope contracts", () => {
  test("ticket list uses permission or project scope", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/work/services/ticket-support.js"),
      "utf8",
    );
    assert.ok(src.includes("admin_tickets"));
    assert.ok(src.includes("getAccessibleProjectIds"));
    assert.ok(src.includes("canViewAllTickets"));
  });

  test("requests list scopes non-admin roles", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/work/controllers/requests.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("getAccessibleProjectIds"));
    assert.ok(src.includes("admin_requests"));
    assert.ok(src.includes("assertCanAccessRequest"));
    assert.ok(src.includes("assertProjectAccess"));
  });
});
