import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  canUserReviewLeaveRequest,
  resolveLeaveNotifierIds,
  normalizeBalanceAllocations,
  buildBalanceTransitionOps,
} from "../../src/services/hrm/leave-approval.js";
import { allocateOldestFirst } from "../../src/services/hrm/leave-accrual.service.js";

describe("canUserReviewLeaveRequest", () => {
  test("blocks self-approval", () => {
    const user = { id: 5, role: "manager" };
    assert.equal(canUserReviewLeaveRequest(user, user), false);
  });

  test("HR admin may approve any request", () => {
    assert.equal(
      canUserReviewLeaveRequest({ id: 1, role: "hr" }, { id: 2, reportingManagerId: 99 }),
      true,
    );
    assert.equal(
      canUserReviewLeaveRequest({ id: 1, role: "super_admin" }, { id: 2, reportingManagerId: null }),
      true,
    );
  });

  test("assigned reporting manager may approve (manager-final)", () => {
    assert.equal(
      canUserReviewLeaveRequest(
        { id: 10, role: "manager" },
        { id: 20, reportingManagerId: 10 },
      ),
      true,
    );
  });

  test("other managers cannot approve when a reporting manager is assigned", () => {
    assert.equal(
      canUserReviewLeaveRequest(
        { id: 11, role: "manager" },
        { id: 20, reportingManagerId: 10 },
      ),
      false,
    );
  });

  test("only HR may approve when employee has no reporting manager", () => {
    assert.equal(
      canUserReviewLeaveRequest(
        { id: 10, role: "manager" },
        { id: 20, reportingManagerId: null },
      ),
      false,
    );
    assert.equal(
      canUserReviewLeaveRequest({ id: 1, role: "hr" }, { id: 20, reportingManagerId: null }),
      true,
    );
  });
});

describe("resolveLeaveNotifierIds", () => {
  test("notifies reporting manager and HR admins", () => {
    const ids = resolveLeaveNotifierIds({ id: 5, reportingManagerId: 10 }, [1, 2]);
    assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2, 10]);
  });

  test("notifies HR only when no reporting manager", () => {
    const ids = resolveLeaveNotifierIds({ id: 5, reportingManagerId: null }, [1, 2]);
    assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2]);
  });

  test("excludes the requester", () => {
    const ids = resolveLeaveNotifierIds({ id: 5, reportingManagerId: 5 }, [5, 6]);
    assert.deepEqual(ids, [6]);
  });
});

describe("normalizeBalanceAllocations", () => {
  test("uses stored FIFO allocations when present", () => {
    const rows = normalizeBalanceAllocations({
      leaveTypeId: 3,
      days: 5,
      balanceAllocations: [
        { leaveTypeId: 1, days: 2 },
        { leaveTypeId: 2, days: 3 },
      ],
    });
    assert.deepEqual(rows, [
      { leaveTypeId: 1, days: 2 },
      { leaveTypeId: 2, days: 3 },
    ]);
  });

  test("falls back to legacy single-type row", () => {
    assert.deepEqual(
      normalizeBalanceAllocations({ leaveTypeId: 3, days: 4 }),
      [{ leaveTypeId: 3, days: 4 }],
    );
  });

  test("returns empty for pure LOP requests", () => {
    assert.deepEqual(
      normalizeBalanceAllocations({ leaveTypeId: 3, days: 2, balanceAllocations: [], lopDays: 2 }),
      [],
    );
  });
});

describe("buildBalanceTransitionOps", () => {
  const rows = [{ leaveTypeId: 1, days: 2, balanceId: 100, version: 3 }];

  test("approve moves pending to used with version guard", () => {
    const [op] = buildBalanceTransitionOps(rows, "approve");
    assert.deepEqual(op.filter, { id: 100, version: 3, pending: { $gte: 2 } });
    assert.deepEqual(op.update, { $inc: { pending: -2, used: 2, version: 1 } });
  });

  test("release drops pending only", () => {
    const [op] = buildBalanceTransitionOps(rows, "release");
    assert.deepEqual(op.update, { $inc: { pending: -2, version: 1 } });
  });
});

describe("LOP overflow at apply time", () => {
  const types = [
    { id: 1, code: "CL", fifoPriority: 1, status: "active", isPaid: true },
    { id: 2, code: "SL", fifoPriority: 2, status: "active", isPaid: true },
  ];

  test("allocates paid balance first and leaves remainder as LOP", () => {
    const balances = new Map([
      [1, { allocated: 1, carriedForward: 0, used: 0, pending: 0 }],
    ]);
    const { allocations, unpaidDays } = allocateOldestFirst(types, balances, 3);
    assert.deepEqual(allocations, [{ leaveTypeId: 1, code: "CL", days: 1 }]);
    assert.equal(unpaidDays, 2);
  });

  test("rejection releases only reserved paid days", () => {
    const request = {
      days: 3,
      lopDays: 2,
      balanceAllocations: [{ leaveTypeId: 1, days: 1 }],
    };
    const allocations = normalizeBalanceAllocations(request);
    assert.deepEqual(allocations, [{ leaveTypeId: 1, days: 1 }]);
    const ops = buildBalanceTransitionOps(
      allocations.map((a) => ({ ...a, balanceId: 50, version: 1 })),
      "release",
    );
    assert.equal(ops.length, 1);
    assert.deepEqual(ops[0].update, { $inc: { pending: -1, version: 1 } });
  });
});
