import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildUserProfileCreateFields,
  buildUserProfilePatchSet,
  formatUserProfileFields,
} from "../../src/utils/user-profile-fields.js";

describe("buildUserProfileCreateFields", () => {
  test("merges first/last name and syncs aliases", () => {
    const fields = buildUserProfileCreateFields({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phoneNumber: "9999999999",
      linkedinUrl: "https://linkedin.com/in/jane",
      reportingManagerId: 5,
      wfhMonthlyLimit: 2,
      leaveAccrualDaysPerMonth: 1.5,
      joiningDate: "2024-01-15",
      departmentId: 3,
      designation: "Engineer",
    });
    assert.equal(fields.name, "Jane Doe");
    assert.equal(fields.firstName, "Jane");
    assert.equal(fields.lastName, "Doe");
    assert.equal(fields.phoneNumber, "9999999999");
    assert.equal(fields.reportingManagerId, 5);
    assert.equal(fields.managerId, 5);
    assert.equal(fields.wfhMonthlyLimit, 2);
    assert.equal(fields.leaveAccrualDaysPerMonth, 1.5);
    assert.equal(fields.linkedinUrl, "https://linkedin.com/in/jane");
    assert.equal(fields.socialProfiles.linkedin, "https://linkedin.com/in/jane");
    assert.ok(fields.joiningDate instanceof Date);
    assert.equal(fields.departmentId, 3);
  });
});

describe("buildUserProfilePatchSet", () => {
  test("syncs manager and leave/wfh nested objects", () => {
    const set = buildUserProfilePatchSet({
      reportingManagerId: 10,
      wfhMonthlyLimit: 3,
      leaveAccrualDaysPerMonth: 2,
      departmentId: 7,
      gender: "Female",
    });
    assert.equal(set.reportingManagerId, 10);
    assert.equal(set.managerId, 10);
    assert.equal(set.wfhMonthlyLimit, 3);
    assert.equal(set.leaveAccrualDaysPerMonth, 2);
    assert.equal(set.departmentId, 7);
    assert.equal(set.gender, "Female");
  });

  test("rejects invalid enum values", () => {
    assert.throws(
      () => buildUserProfilePatchSet({ gender: "Invalid" }),
      (err) => err.message.includes("Invalid gender"),
    );
  });
});

describe("formatUserProfileFields", () => {
  const sampleUser = {
    name: "John Smith",
    salary: { netSalary: 50000, bankAccount: { accountNumber: "1234" } },
    aadharNumber: 123456789012,
    panNumber: "ABCDE1234F",
    idProofUrl: "https://example.com/id.pdf",
  };

  test("redacts sensitive fields by default", () => {
    const out = formatUserProfileFields(sampleUser);
    assert.equal(out.salary, undefined);
    assert.equal(out.aadharNumber, undefined);
    assert.equal(out.panNumber, undefined);
    assert.equal(out.idProofUrl, undefined);
    assert.equal(out.firstName, "John");
    assert.equal(out.lastName, "Smith");
  });

  test("includes sensitive fields when requested", () => {
    const out = formatUserProfileFields(sampleUser, { includeSensitive: true });
    assert.equal(out.salary.netSalary, 50000);
    assert.equal(out.aadharNumber, 123456789012);
    assert.equal(out.panNumber, "ABCDE1234F");
    assert.equal(out.idProofUrl, "https://example.com/id.pdf");
  });
});
