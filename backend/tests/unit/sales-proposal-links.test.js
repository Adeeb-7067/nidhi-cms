import test from "node:test";
import assert from "node:assert/strict";
import { customerProposalOwnershipFilter } from "../../src/utils/sales-proposal-links.js";

test("customerProposalOwnershipFilter includes lead-linked proposals when leadId exists", () => {
  assert.deepEqual(customerProposalOwnershipFilter(42, 7), {
    $or: [{ customerId: 42 }, { leadId: 7 }],
  });
});

test("customerProposalOwnershipFilter uses customerId only when leadId is missing", () => {
  assert.deepEqual(customerProposalOwnershipFilter(42, null), { customerId: 42 });
  assert.deepEqual(customerProposalOwnershipFilter(42, undefined), { customerId: 42 });
});
