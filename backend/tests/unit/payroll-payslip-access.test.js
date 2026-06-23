import { test, describe } from "node:test";
import assert from "node:assert/strict";

/** Mirrors listMyPayslips / getPayslipDetail publish gate for self-service roles. */
function isPayslipPublishedForEmployee(runStatus) {
  return runStatus === "finalized" || runStatus === "paid";
}

describe("employee payslip visibility", () => {
  test("draft and reviewed runs are hidden from employees", () => {
    assert.equal(isPayslipPublishedForEmployee("draft"), false);
    assert.equal(isPayslipPublishedForEmployee("reviewed"), false);
  });

  test("finalized and paid runs are visible", () => {
    assert.equal(isPayslipPublishedForEmployee("finalized"), true);
    assert.equal(isPayslipPublishedForEmployee("paid"), true);
  });
});

describe("payroll admin capabilities by permission", () => {
  const adminCan = (perms) => ({
    viewPayroll: perms.has("hrm_payroll:view"),
    createPayroll: perms.has("hrm_payroll:create"),
    finalizePayroll: perms.has("hrm_payroll:finalize"),
    exportPayroll: perms.has("hrm_payroll:export"),
    viewMyPayslips: perms.has("hrm_my_payslips:view"),
  });

  test("hr_admin template grants full payroll", () => {
    const perms = new Set([
      "hrm_payroll:view",
      "hrm_payroll:create",
      "hrm_payroll:edit",
      "hrm_payroll:finalize",
      "hrm_payroll:export",
      "hrm_my_payslips:view",
    ]);
    const caps = adminCan(perms);
    assert.equal(caps.viewPayroll, true);
    assert.equal(caps.createPayroll, true);
    assert.equal(caps.finalizePayroll, true);
    assert.equal(caps.exportPayroll, true);
  });

  test("employee template is self-service only", () => {
    const perms = new Set(["hrm_my_payslips:view", "hrm_my_attendance:view"]);
    const caps = adminCan(perms);
    assert.equal(caps.viewPayroll, false);
    assert.equal(caps.viewMyPayslips, true);
  });

  test("payroll_viewer template is read-only payroll", () => {
    const perms = new Set(["hrm_payroll:view", "hrm_payroll:export", "hrm_employees:view"]);
    const caps = adminCan(perms);
    assert.equal(caps.viewPayroll, true);
    assert.equal(caps.createPayroll, false);
    assert.equal(caps.finalizePayroll, false);
    assert.equal(caps.exportPayroll, true);
  });
});
