import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClientAsCustomer,
  customerUpdatesToClientSet,
} from "../../src/mappers/client-customer-format.js";

test("formatClientAsCustomer maps unified client to sales API shape", () => {
  const row = formatClientAsCustomer({
    id: 42,
    companyName: "Acme Corp",
    contactPerson: "Jane Doe",
    email: "jane@acme.com",
    phone: "9999999999",
    address: "Mumbai",
    gstNumber: "27AAAAA0000A1Z5",
    website: "https://acme.example",
    status: "active",
    customerType: "corporate",
    leadId: 7,
    userId: 3,
    assignedAdminId: 5,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  }, { totalSales: 1000, outstanding: 200 });

  assert.equal(row.id, 42);
  assert.equal(row.clientId, 42);
  assert.equal(row.type, "corporate");
  assert.equal(row.location, "Mumbai");
  assert.equal(row.gstin, "27AAAAA0000A1Z5");
  assert.equal(row.portalUserId, 3);
  assert.equal(row.totalSales, 1000);
});

test("customerUpdatesToClientSet maps sales patch fields onto client columns", () => {
  assert.deepEqual(
    customerUpdatesToClientSet({
      companyName: "Acme",
      type: "sme",
      location: "Delhi",
      gstin: "GST123",
    }),
    {
      companyName: "Acme",
      customerType: "sme",
      address: "Delhi",
      gstNumber: "GST123",
    },
  );
});
