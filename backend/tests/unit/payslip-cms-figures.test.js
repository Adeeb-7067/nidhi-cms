import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildCmsPayrollPayload, buildPayslipFigures } from "../../src/services/hrm/payslip-template.js";

describe("CMS payslip figures", () => {
  test("shows prorated earnings, not full-month contract, for partial attendance", () => {
    const payRollData = buildCmsPayrollPayload({
      user: {
        name: "Jane Doe",
        employeeId: "E001",
        salary: { basicSalary: 50000, allowances: 5000, netSalary: 53000 },
      },
      run: { year: 2026, month: 6, status: "draft" },
      line: {
        gross: 26500,
        net: 24500,
        paidDays: 15,
        lopDays: 2,
        lopDeduction: 2000,
        pfEmployee: 0,
        tds: 0,
        lateCount: 0,
      },
      structure: {
        basic: 50000,
        allowances: 5000,
        hra: 0,
        contractNet: 53000,
      },
    });

    const figures = buildPayslipFigures(payRollData, { companyName: "Test Co" });

    assert.equal(figures.grossEarnings, 26500);
    assert.equal(figures.netPay, 24500);
    assert.equal(figures.totalDeductions, 2000);
    assert.equal(figures.paidDays, 15);
    assert.equal(figures.lopDays, 2);
    assert.ok(figures.grossEarnings < 53000, "earnings must be prorated below monthly contract");
  });

  test("full-month pay reconciles when no LOP", () => {
    const payRollData = buildCmsPayrollPayload({
      user: {
        name: "John Smith",
        salary: { basicSalary: 30000, allowances: 0, netSalary: 30000 },
      },
      run: { year: 2026, month: 6, status: "paid" },
      line: {
        gross: 30000,
        net: 30000,
        paidDays: 30,
        lopDays: 0,
        lopDeduction: 0,
        pfEmployee: 0,
        tds: 0,
        lateCount: 0,
      },
      structure: { basic: 30000, allowances: 0, hra: 0, contractNet: 30000 },
    });

    const figures = buildPayslipFigures(payRollData, {});
    assert.equal(figures.grossEarnings, 30000);
    assert.equal(figures.netPay, 30000);
    assert.equal(figures.totalDeductions, 0);
  });
});
