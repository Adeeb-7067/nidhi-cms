/**
 * Hybrid RBAC regression: users IDOR + staff picker contracts.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  formatStaffPickerUser,
  isPeopleAdminRole,
  STAFF_PICKER_PROJECTION,
} from "../../src/services/access/access-context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("access-context helpers", () => {
  test("people admin roles", () => {
    assert.equal(isPeopleAdminRole("super_admin"), true);
    assert.equal(isPeopleAdminRole("hr"), true);
    assert.equal(isPeopleAdminRole("developer"), false);
    assert.equal(isPeopleAdminRole("finance"), false);
  });

  test("staff picker projection omits email/phone", () => {
    assert.equal(STAFF_PICKER_PROJECTION.email, undefined);
    assert.equal(STAFF_PICKER_PROJECTION.phoneNumber, undefined);
    assert.equal(STAFF_PICKER_PROJECTION.id, 1);
    assert.equal(STAFF_PICKER_PROJECTION.name, 1);
  });

  test("formatStaffPickerUser returns minimal metadata", () => {
    const row = formatStaffPickerUser({
      id: 9,
      employeeId: "DE001",
      name: "Ada",
      email: "secret@example.com",
      phoneNumber: "999",
      role: "developer",
      status: "active",
      department: "Eng",
    });
    assert.equal(row.id, 9);
    assert.equal(row.name, "Ada");
    assert.equal(row.email, undefined);
    assert.equal(row.phoneNumber, undefined);
  });
});

describe("users controller Hybrid contracts", () => {
  test("GET /users/:id uses assertCanViewUserProfile", () => {
    const src = readFileSync(
      join(__dirname, "../../src/controllers/users.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("assertCanViewUserProfile"));
    assert.ok(src.includes("buildStaffPickerQuery"));
    assert.ok(!src.includes("Clients may only read their own user record"));
  });
});
