import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure-unit tests for withJobLock — we stub the schema module so node:test
 * can run without a live MongoDB instance. The DB-backed integration test
 * lives in a separate file (skipped when DATABASE_URL is unset).
 */

// In-memory simulation of the (jobName, periodKey) unique index.
const rows = new Map();
let counter = 0;

function reset() {
  rows.clear();
  counter = 0;
}

mock.module("../../src/models/schema/index.js", {
  namedExports: {
    jobRunsTable: {
      async create(doc) {
        const key = `${doc.jobName}::${doc.periodKey}`;
        if (rows.has(key)) {
          const err = new Error("E11000 duplicate key");
          err.code = 11000;
          throw err;
        }
        const row = { ...doc };
        rows.set(key, row);
        return row;
      },
      async findOne(filter) {
        const key = `${filter.jobName}::${filter.periodKey}`;
        const row = rows.get(key);
        if (!row) return null;
        return { ...row, lean: undefined };
      },
      async updateOne(filter, update) {
        for (const row of rows.values()) {
          if (row.id !== filter.id) continue;
          Object.assign(row, update.$set ?? {});
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      },
    },
    async getNextSequence(_name) {
      counter += 1;
      return counter;
    },
  },
});

// Also stub the logger so it doesn't spam test output.
mock.module("../../src/lib/logger.js", {
  namedExports: {
    logger: {
      info() {},
      warn() {},
      error() {},
      debug() {},
    },
  },
});

const { withJobLock, hasJobRun } = await import(
  "../../src/modules/jobs/services/withJobLock.js"
);

// `findOne(...).lean()` is the production pattern; emulate it on the mock.
const realFindOne = (await import("../../src/models/schema/index.js")).jobRunsTable.findOne;
(await import("../../src/models/schema/index.js")).jobRunsTable.findOne = (filter) => ({
  async lean() {
    return realFindOne(filter);
  },
});

describe("withJobLock", () => {
  beforeEach(() => reset());

  test("runs fn once and marks succeeded", async () => {
    let calls = 0;
    const outcome = await withJobLock("accrual", "2026-06", async () => {
      calls += 1;
      return { credited: 42 };
    });
    assert.equal(outcome.status, "ran");
    assert.deepEqual(outcome.result, { credited: 42 });
    assert.equal(calls, 1);

    const row = [...rows.values()][0];
    assert.equal(row.status, "succeeded");
    assert.equal(row.jobName, "accrual");
    assert.equal(row.periodKey, "2026-06");
    assert.deepEqual(row.result, { credited: 42 });
    assert.ok(row.finishedAt instanceof Date);
  });

  test("second attempt for same period is skipped", async () => {
    let calls = 0;
    const first = await withJobLock("accrual", "2026-06", async () => {
      calls += 1;
      return "ok";
    });
    assert.equal(first.status, "ran");

    const second = await withJobLock("accrual", "2026-06", async () => {
      calls += 1;
      return "should not run";
    });
    assert.equal(second.status, "skipped");
    assert.equal(second.reason, "already_ran");
    assert.equal(calls, 1, "fn must not run twice for the same period");
  });

  test("different periods do not interfere", async () => {
    const a = await withJobLock("accrual", "2026-06", async () => "june");
    const b = await withJobLock("accrual", "2026-07", async () => "july");
    assert.equal(a.status, "ran");
    assert.equal(b.status, "ran");
    assert.equal(a.result, "june");
    assert.equal(b.result, "july");
  });

  test("different job names do not interfere", async () => {
    const a = await withJobLock("accrual", "2026-06", async () => "a");
    const b = await withJobLock("payroll", "2026-06", async () => "b");
    assert.equal(a.status, "ran");
    assert.equal(b.status, "ran");
  });

  test("body throwing marks the row failed and surfaces error", async () => {
    const outcome = await withJobLock("accrual", "2026-06", async () => {
      throw new Error("boom");
    });
    assert.equal(outcome.status, "failed");
    assert.equal(outcome.error, "boom");

    const row = [...rows.values()][0];
    assert.equal(row.status, "failed");
    assert.match(row.error, /boom/);
  });

  test("retrying a failed period is skipped (no auto-retry)", async () => {
    await withJobLock("accrual", "2026-06", async () => {
      throw new Error("first attempt failed");
    });
    let secondCalls = 0;
    const second = await withJobLock("accrual", "2026-06", async () => {
      secondCalls += 1;
      return "would succeed";
    });
    assert.equal(second.status, "skipped");
    assert.equal(second.reason, "previous_attempt_failed");
    assert.equal(secondCalls, 0);
  });

  test("hasJobRun returns true only after a successful run", async () => {
    assert.equal(await hasJobRun("accrual", "2026-06"), false);
    await withJobLock("accrual", "2026-06", async () => "ok");
    assert.equal(await hasJobRun("accrual", "2026-06"), true);
  });

  test("throws on missing jobName or periodKey", async () => {
    await assert.rejects(() => withJobLock("", "2026-06", async () => {}));
    await assert.rejects(() => withJobLock("accrual", "", async () => {}));
  });
});
