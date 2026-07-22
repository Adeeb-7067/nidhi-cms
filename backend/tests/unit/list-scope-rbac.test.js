/**
 * Regression: list-scope helpers must not leave hr/unknown roles unscoped.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyIdScope, canListAllCompanies, canListAllProjects } from "../../src/services/access/list-scope.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("list-scope helpers", () => {
  test("applyIdScope null = unrestricted", () => {
    const q = {};
    assert.equal(applyIdScope(q, "id", null), true);
    assert.equal(q.id, undefined);
  });

  test("applyIdScope empty = deny", () => {
    assert.equal(applyIdScope({}, "id", []), false);
  });

  test("applyIdScope sets $in", () => {
    const q = {};
    assert.equal(applyIdScope(q, "id", [1, 2, 3]), true);
    assert.deepEqual(q.id, { $in: [1, 2, 3] });
  });

  test("company / project unrestricted roles", () => {
    assert.equal(canListAllCompanies("super_admin"), true);
    assert.equal(canListAllCompanies("hr"), true);
    assert.equal(canListAllCompanies("finance"), true);
    assert.equal(canListAllCompanies("digital"), false);
    assert.equal(canListAllCompanies("client"), false);
    assert.equal(canListAllCompanies("developer"), false);

    assert.equal(canListAllProjects("super_admin"), true);
    assert.equal(canListAllProjects("finance"), true);
    assert.equal(canListAllProjects("hr"), false);
    assert.equal(canListAllProjects("digital"), false);
  });
});

describe("RBAC P0 hardening contracts", () => {
  test("users controller only exposes sensitive fields to self/hr/super_admin", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/users.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("isPeopleAdmin"), "people-admin check required");
    assert.ok(!src.includes("adminStaffRoles.includes(req.user.role)"), "must not grant sensitive to all staff");
  });

  test("projects list scopes non-finance roles", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/projects.controller.js"),
      "utf8",
    );
    assert.ok(src.includes('req.user.role !== "finance"'), "finance exempt for pickers");
    assert.ok(src.includes("getAccessibleProjectIds"), "hr/other roles use scope helper");
  });

  test("clients/companies list use company scope", () => {
    const clients = readFileSync(
      join(__dirname, "../../src/controllers/clients.controller.js"),
      "utf8",
    );
    const companies = readFileSync(
      join(__dirname, "../../src/controllers/companies.controller.js"),
      "utf8",
    );
    assert.ok(clients.includes("getAccessibleCompanyIds"));
    assert.ok(companies.includes("getAccessibleCompanyIds"));
    assert.ok(clients.includes("assertCompanyAccess"));
  });

  test("search controller applies project/company scope", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/search.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("getAccessibleProjectIds"));
    assert.ok(src.includes("getAccessibleCompanyIds"));
  });

  test("screenshots admin check uses super_admin|hr not phantom admin", () => {
    const svc = readFileSync(
      join(__dirname, "../../src/services/screenshots.service.js"),
      "utf8",
    );
    assert.ok(svc.includes('["super_admin", "hr"]'));
    assert.ok(!svc.includes('"admin"'));
  });
});
