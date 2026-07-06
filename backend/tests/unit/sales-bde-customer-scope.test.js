import test from "node:test";
import assert from "node:assert/strict";
import {
  bdeCustomerOwnershipFilter,
  bdeOwnsCustomer,
  bdeOwnsProposal,
  resolveCustomerAssignedAdminId,
  isSalesAdminRole,
} from "../../src/utils/sales-bde-customer-scope.js";

test("bdeCustomerOwnershipFilter matches assigned admin or creator", () => {
  assert.deepEqual(bdeCustomerOwnershipFilter(7), {
    $or: [{ assignedAdminId: 7 }, { createdBy: 7 }],
  });
});

test("bdeOwnsCustomer accepts assignedAdminId or createdBy", () => {
  assert.equal(bdeOwnsCustomer({ assignedAdminId: 5, createdBy: 1 }, 5), true);
  assert.equal(bdeOwnsCustomer({ assignedAdminId: null, createdBy: 5 }, 5), true);
  assert.equal(bdeOwnsCustomer({ assignedAdminId: 3, createdBy: 1 }, 5), false);
});

test("resolveCustomerAssignedAdminId prefers BDE self-assignment", () => {
  assert.equal(
    resolveCustomerAssignedAdminId({
      userRole: "bde",
      userId: 12,
      bodyAssignedAdminId: 99,
      leadAssignedTo: 8,
    }),
    12,
  );
  assert.equal(
    resolveCustomerAssignedAdminId({
      userRole: "super_admin",
      userId: 1,
      bodyAssignedAdminId: 99,
    }),
    99,
  );
  assert.equal(
    resolveCustomerAssignedAdminId({
      userRole: "super_admin",
      userId: 1,
      leadAssignedTo: 8,
    }),
    8,
  );
});

test("isSalesAdminRole is limited to super_admin and hr", () => {
  assert.equal(isSalesAdminRole("super_admin"), true);
  assert.equal(isSalesAdminRole("hr"), true);
  assert.equal(isSalesAdminRole("bde"), false);
  assert.equal(isSalesAdminRole("manager"), false);
});

test("bdeOwnsProposal matches assigned executive", () => {
  assert.equal(bdeOwnsProposal({ assignedTo: 63 }, 63), true);
  assert.equal(bdeOwnsProposal({ assignedTo: 63 }, 30), false);
  assert.equal(bdeOwnsProposal(null, 63), false);
});
