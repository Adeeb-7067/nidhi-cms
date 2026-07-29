import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("budget ↔ expense linking", () => {
  it("expense schema stores optional budgetId", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/schema/expenses.js"),
      "utf8",
    );
    assert.ok(src.includes("budgetId"));
    assert.ok(src.includes("FinanceBudgets"));
  });

  it("expense create/update validates budgetId", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/controllers/expenses.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("assertBudgetId"));
    assert.ok(src.includes("budgetName"));
  });

  it("computeSpentForBudget counts explicit budgetId plus legacy heuristics", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/controllers/budgets.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("budgetId: budget.id"));
    assert.ok(src.includes("budgetId: null"));
    assert.ok(src.includes("computeSpentForBudget"));
  });
});
