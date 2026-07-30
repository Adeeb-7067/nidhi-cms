import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  deriveNdaStatus,
  deriveAgreementStatus,
  computeComplianceScore,
  sumExpensesYtd,
  buildLegalDashboardKpis,
  buildCasesByStatus,
  buildRiskDistribution,
  buildUpcomingHearings,
  buildNdaExpiryAlerts,
  buildAgreementRenewalReminders,
  expensesByCategory,
} from "../../src/modules/legal/services/dashboard.service.js";
import { daysUntil, pctChange } from "../../src/modules/legal/services/helpers.js";

describe("daysUntil", () => {
  test("counts whole days from start-of-day", () => {
    const now = new Date("2026-06-01T15:00:00Z");
    assert.equal(daysUntil("2026-06-01T00:00:00Z", now), 0);
    assert.equal(daysUntil("2026-06-03T12:00:00Z", now), 2);
    assert.equal(daysUntil("2026-05-31T12:00:00Z", now), -1);
  });
});

describe("pctChange", () => {
  test("handles zero baseline and normal deltas", () => {
    assert.equal(pctChange(0, 0), 0);
    assert.equal(pctChange(5, 0), 100);
    assert.equal(pctChange(120, 100), 20);
    assert.equal(pctChange(80, 100), -20);
  });
});

describe("deriveNdaStatus", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  test("keeps draft", () => {
    assert.equal(deriveNdaStatus("draft", "2026-07-01", { now }), "draft");
  });

  test("marks expired when past expiry", () => {
    assert.equal(deriveNdaStatus("active", "2026-06-01", { now, alertDays: 45 }), "expired");
  });

  test("marks expiring_soon within alert window", () => {
    assert.equal(deriveNdaStatus("active", "2026-07-01", { now, alertDays: 45 }), "expiring_soon");
  });

  test("returns active when far from expiry", () => {
    assert.equal(deriveNdaStatus("active", "2026-12-01", { now, alertDays: 45 }), "active");
  });
});

describe("deriveAgreementStatus", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  test("marks renewal_due within window", () => {
    assert.equal(
      deriveAgreementStatus("active", "2026-07-01", { now, renewalDays: 60 }),
      "renewal_due",
    );
  });

  test("keeps terminated", () => {
    assert.equal(deriveAgreementStatus("terminated", "2026-07-01", { now }), "terminated");
  });
});

describe("computeComplianceScore", () => {
  test("empty list is 100", () => {
    assert.equal(computeComplianceScore([]), 100);
  });

  test("weights compliant and partial", () => {
    assert.equal(
      computeComplianceScore([
        { status: "compliant" },
        { status: "partial" },
        { status: "non_compliant" },
        { status: "review_pending" },
      ]),
      38, // (1 + 0.5) / 4 * 100
    );
  });
});

describe("sumExpensesYtd", () => {
  test("sums only current calendar year", () => {
    const now = new Date("2026-06-01");
    assert.equal(
      sumExpensesYtd(
        [
          { date: "2026-01-10", amount: 100 },
          { date: "2025-12-31", amount: 999 },
          { date: "2026-05-01", amount: 50.5 },
        ],
        now,
      ),
      150.5,
    );
  });
});

describe("buildLegalDashboardKpis", () => {
  test("aggregates active cases, alerts, and high risk", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const kpis = buildLegalDashboardKpis({
      now,
      alertDays: 45,
      employeeCases: [
        { status: "open", risk: "high" },
        { status: "closed", risk: "low" },
        { status: "resolved", risk: "medium" },
      ],
      ndas: [
        { status: "active", expiresAt: "2026-06-20", risk: "low" },
        { status: "active", expiresAt: "2026-12-01", risk: "low" },
      ],
      courtCases: [
        { status: "hearing", risk: "high" },
        { status: "closed", risk: "low" },
      ],
      complianceItems: [{ status: "compliant" }, { status: "compliant" }],
      expenses: [{ date: "2026-03-01", amount: 1000 }],
      vendorDisputes: [{ risk: "high" }],
      clientMatters: [],
      notices: [],
    });

    assert.equal(kpis.activeCases, 1);
    assert.equal(kpis.ndaAlerts, 1);
    assert.equal(kpis.courtCases, 1);
    assert.equal(kpis.complianceScore, 100);
    assert.equal(kpis.expensesYtd, 1000);
    assert.equal(kpis.highRiskItems, 3); // open case, court, vendor
  });
});

describe("buildCasesByStatus", () => {
  test("counts each status", () => {
    const rows = buildCasesByStatus([{ status: "open" }, { status: "open" }, { status: "mediation" }]);
    assert.equal(rows.find((r) => r.status === "open").count, 2);
    assert.equal(rows.find((r) => r.status === "mediation").count, 1);
  });
});

describe("buildRiskDistribution", () => {
  test("returns percentages", () => {
    const dist = buildRiskDistribution([
      { risk: "low" },
      { risk: "low" },
      { risk: "high" },
      { risk: "medium" },
    ]);
    assert.equal(dist.find((d) => d.risk === "low").count, 2);
    assert.equal(dist.find((d) => d.risk === "low").value, 50);
  });
});

describe("buildUpcomingHearings", () => {
  test("merges and sorts by date", () => {
    const hearings = buildUpcomingHearings({
      employeeCases: [
          {
            id: 1,
            caseNumber: "ELC-1",
            employeeName: "A",
            nextHearing: "2026-07-10",
            risk: "low",
            assignedTo: { id: 9 },
          },
      ],
      courtCases: [
        {
          id: 2,
          caseNumber: "CC-1",
          title: "Matter",
          nextHearing: "2026-07-01",
          risk: "high",
        },
      ],
    });
    assert.equal(hearings.length, 2);
    assert.equal(hearings[0].title, "CC-1");
    assert.equal(hearings[1].href, "/legal/cases/1");
  });
});

describe("buildNdaExpiryAlerts", () => {
  test("includes expiring and expired", () => {
    const now = new Date("2026-06-15");
    const alerts = buildNdaExpiryAlerts(
      [
        { id: 1, status: "active", expiresAt: "2026-06-20" },
        { id: 2, status: "active", expiresAt: "2026-12-01" },
        { id: 3, status: "draft", expiresAt: "2026-06-20" },
      ],
      { now, alertDays: 45 },
    );
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].id, 1);
  });
});

describe("buildAgreementRenewalReminders", () => {
  test("includes renewal_due", () => {
    const now = new Date("2026-06-15");
    const rows = buildAgreementRenewalReminders(
      [
        { id: 1, status: "active", renewalDate: "2026-07-01" },
        { id: 2, status: "draft", renewalDate: "2026-07-01" },
      ],
      { now, renewalDays: 60 },
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 1);
  });
});

describe("expensesByCategory", () => {
  test("groups amounts", () => {
    const rows = expensesByCategory([
      { category: "court_fees", amount: 100 },
      { category: "court_fees", amount: 50 },
      { category: "travel", amount: 25 },
    ]);
    assert.deepEqual(
      rows.sort((a, b) => a.category.localeCompare(b.category)),
      [
        { category: "court_fees", amount: 150 },
        { category: "travel", amount: 25 },
      ],
    );
  });
});
