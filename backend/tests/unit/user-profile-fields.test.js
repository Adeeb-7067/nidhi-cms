import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildUserProfileCreateFields,
  buildUserProfilePatchSet,
  buildProfilePatchMongoUpdate,
  buildSelfServiceProfilePatchSet,
  pickSelfServiceProfileBody,
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

  test("clears gender/marital via unset and blood group via empty string", () => {
    const set = buildUserProfilePatchSet({
      gender: "",
      maritalStatus: "",
      bloodGroup: "",
    });
    const mongo = buildProfilePatchMongoUpdate(set);
    assert.deepEqual(mongo.$unset, { gender: "", maritalStatus: "" });
    assert.equal(mongo.$set.bloodGroup, "");
    assert.equal(mongo.$set.gender, undefined);
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

describe("buildSelfServiceProfilePatchSet", () => {
  test("allows personal fields and strips admin keys", () => {
    const set = buildSelfServiceProfilePatchSet({
      firstName: "Alex",
      lastName: "Lee",
      gender: "Male",
      phoneNumber: "9876543210",
      role: "super_admin",
      departmentId: 99,
      leaveAccrualDaysPerMonth: 5,
    });
    assert.equal(set.firstName, "Alex");
    assert.equal(set.gender, "Male");
    assert.equal(set.phoneNumber, "9876543210");
    assert.equal(set.role, undefined);
    assert.equal(set.departmentId, undefined);
    assert.equal(set.leaveAccrualDaysPerMonth, undefined);
  });

  test("merges bank account without resetting salary amounts", () => {
    const set = buildSelfServiceProfilePatchSet(
      {
        salary: {
          basicSalary: 99999,
          bankAccount: {
            accountNumber: "NEW123",
            ifsc: "HDFC0001",
          },
        },
      },
      {
        existingSalary: {
          basicSalary: 50000,
          allowances: 5000,
          deductions: 1000,
          netSalary: 54000,
          bankAccount: { accountNumber: "OLD" },
        },
      },
    );
    assert.equal(set.salary.basicSalary, 50000);
    assert.equal(set.salary.netSalary, 54000);
    assert.equal(set.salary.bankAccount.accountNumber, "NEW123");
    assert.equal(set.salary.bankAccount.ifsc, "HDFC0001");
  });

  test("pickSelfServiceProfileBody ignores unknown keys", () => {
    const body = pickSelfServiceProfileBody({
      bio: "Hello",
      status: "inactive",
      wfhMonthlyLimit: 10,
    });
    assert.equal(body.bio, "Hello");
    assert.equal(body.status, undefined);
    assert.equal(body.wfhMonthlyLimit, undefined);
  });
});
