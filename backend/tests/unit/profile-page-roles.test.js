import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  staffEmployeeRoles,
  userRoles,
} from "../../src/constants/user-roles.js";
import { canAccessHrm } from "../../src/constants/permissions.js";
import { buildSelfServiceProfilePatchSet } from "../../src/utils/user-profile-fields.js";

/** Mirrors frontend SIMPLE_PROFILE_ONLY_ROLES + usesEmployeeSelfProfileOnPage. */
function usesEmployeeSelfProfileOnPage(role, employeeId) {
  const simpleOnly = new Set(["super_admin", "client", "freelancer"]);
  if (simpleOnly.has(role)) return false;
  return Boolean(String(employeeId ?? "").trim());
}

describe("profile page role matrix", () => {
  test("every CMS role is covered by route + profile mode expectations", () => {
    const profilePageRoles = new Set([
      "super_admin",
      "hr",
      "bde",
      "finance",
      "digital",
      "ca",
      "manager",
      "developer",
      "tester",
      "qa",
      "freelancer",
      "client",
    ]);
    for (const role of userRoles) {
      assert.ok(profilePageRoles.has(role), `missing /profile coverage for ${role}`);
    }
  });

  test("staff team roles receive employeeId on create", () => {
    assert.deepEqual(staffEmployeeRoles, [
      "manager",
      "developer",
      "tester",
      "qa",
      "freelancer",
      "bde",
      "finance",
      "digital",
      "ca",
    ]);
  });

  test("employee self-service form roles (with employeeId)", () => {
    const cases = [
      ["hr", "HR-001", true],
      ["manager", "MGR-001", true],
      ["developer", "DEV-001", true],
      ["tester", "TST-001", true],
      ["qa", "QA-001", true],
      ["bde", "BDE-001", true],
      ["finance", "FIN-001", true],
      ["digital", "DIG-001", true],
      ["ca", "CA-001", true],
      ["freelancer", "FL-001", false],
      ["super_admin", "ADM-001", false],
      ["client", "CL-001", false],
      ["developer", null, false],
      ["hr", "", false],
    ];
    for (const [role, employeeId, expected] of cases) {
      assert.equal(
        usesEmployeeSelfProfileOnPage(role, employeeId),
        expected,
        `${role} + ${employeeId}`,
      );
    }
  });

  test("HRM APIs available for internal staff except client", () => {
    for (const role of userRoles) {
      assert.equal(canAccessHrm(role), role !== "client", role);
    }
  });
});

describe("profile save payloads by role", () => {
  test("simple account patch for client/freelancer/super_admin", () => {
    const set = buildSelfServiceProfilePatchSet({
      name: "Portal User",
      email: "user@example.com",
      designation: "Contact",
      phoneNumber: "9876543210",
      avatarUrl: "/uploads/avatar.png",
      role: "client",
      departmentId: 3,
    });
    assert.equal(set.name, "Portal User");
    assert.equal(set.phoneNumber, "9876543210");
    assert.equal(set.departmentId, undefined);
    assert.equal(set.role, undefined);
  });

  test("employee self-service patch keeps personal + bank fields only", () => {
    const set = buildSelfServiceProfilePatchSet(
      {
        firstName: "Riya",
        lastName: "Sharma",
        gender: "Female",
        phoneNumber: "9876543210",
        panNumber: "ABCDE1234F",
        resumeUrl: "/uploads/resume.pdf",
        salary: {
          bankAccount: { accountNumber: "1234567890", ifsc: "HDFC0001234" },
          basicSalary: 99999,
        },
        departmentId: 2,
        wfhMonthlyLimit: 5,
      },
      { existingSalary: { basicSalary: 45000, allowances: 5000, deductions: 0, netSalary: 50000 } },
    );
    assert.equal(set.firstName, "Riya");
    assert.equal(set.gender, "Female");
    assert.equal(set.salary.basicSalary, 45000);
    assert.equal(set.salary.bankAccount.accountNumber, "1234567890");
    assert.equal(set.departmentId, undefined);
    assert.equal(set.wfhMonthlyLimit, undefined);
  });
});
