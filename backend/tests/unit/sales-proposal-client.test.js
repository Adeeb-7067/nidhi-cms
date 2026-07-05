import test from "node:test";
import assert from "node:assert/strict";
import {
  canClientRespondToProposal,
  isProposalValidityActive,
  statusAfterValidityExtension,
} from "../../src/utils/sales-proposal-client.js";

test("isProposalValidityActive treats valid-until day as inclusive", () => {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  assert.equal(isProposalValidityActive(today.toISOString()), true);
});

test("canClientRespondToProposal allows sent and seen", () => {
  assert.equal(canClientRespondToProposal({ status: "sent" }), true);
  assert.equal(canClientRespondToProposal({ status: "seen" }), true);
});

test("canClientRespondToProposal reopens expired proposal with future validUntil", () => {
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  assert.equal(
    canClientRespondToProposal({ status: "expired", validUntil: future, sentAt: new Date().toISOString() }),
    true,
  );
});

test("canClientRespondToProposal blocks expired proposal with past validUntil", () => {
  const past = new Date(Date.now() - 7 * 86400000).toISOString();
  assert.equal(
    canClientRespondToProposal({ status: "expired", validUntil: past, sentAt: new Date().toISOString() }),
    false,
  );
});

test("canClientRespondToProposal blocks counter_offer awaiting staff review", () => {
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  assert.equal(
    canClientRespondToProposal({ status: "counter_offer", validUntil: future, sentAt: new Date().toISOString() }),
    false,
  );
});

test("statusAfterValidityExtension reopens revised proposal that was already sent", () => {
  const future = new Date(Date.now() + 7 * 86400000);
  const status = statusAfterValidityExtension(
    { status: "revised", sentAt: new Date(), seenAt: new Date() },
    future,
  );
  assert.equal(status, "seen");
});

test("statusAfterValidityExtension ignores draft proposals", () => {
  const future = new Date(Date.now() + 7 * 86400000);
  assert.equal(statusAfterValidityExtension({ status: "draft" }, future), null);
});
