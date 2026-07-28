import test from "node:test";
import assert from "node:assert/strict";
import { isExitDeactivationDue } from "../../src/modules/hrm/services/exit.service.js";

const lwd = new Date("2026-07-10T15:30:00.000Z");

test("employee stays active on last working day", () => {
  assert.equal(isExitDeactivationDue(lwd, new Date("2026-07-10T00:00:00.000Z")), false);
});

test("employee deactivates the day after last working day", () => {
  assert.equal(isExitDeactivationDue(lwd, new Date("2026-07-11T00:00:00.000Z")), true);
});

test("employee stays active before last working day", () => {
  assert.equal(isExitDeactivationDue(lwd, new Date("2026-07-09T00:00:00.000Z")), false);
});
