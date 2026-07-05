import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldSyncPortalEmailWithContact,
} from "../../src/services/client-company-provision.js";
import { formatClientAsCustomer } from "../../src/mappers/client-customer-format.js";

test("shouldSyncPortalEmailWithContact is true only when emails match", () => {
  assert.equal(shouldSyncPortalEmailWithContact("a@x.com", "a@x.com"), true);
  assert.equal(shouldSyncPortalEmailWithContact("A@X.com", "a@x.com"), true);
  assert.equal(shouldSyncPortalEmailWithContact("a@x.com", "login@x.com"), false);
  assert.equal(shouldSyncPortalEmailWithContact(null, "a@x.com"), false);
});

test("formatClientAsCustomer exposes directConversationId", () => {
  const row = formatClientAsCustomer({
    id: 1,
    companyName: "Co",
    contactPerson: "Jane",
    email: "j@co.com",
    status: "active",
    customerType: "corporate",
    userId: 9,
    portalLogin: true,
    directConversationId: 55,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  assert.equal(row.directConversationId, 55);
  assert.equal(row.portalUserId, 9);
});
