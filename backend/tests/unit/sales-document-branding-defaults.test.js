import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeDocumentBranding,
  normalizeCustomFields,
  publicProposalDocumentBranding,
} from "../../src/utils/sales-document-branding-defaults.js";

test("mergeDocumentBranding trims values and keeps cleared fields empty", () => {
  const merged = mergeDocumentBranding({
    gstin: " 27TEST1234F1Z5 ",
    email: "",
    phone: null,
    customFields: [{ label: "MSME", value: "UDYAM-1", showOnInvoice: true }],
  });
  assert.equal(merged.gstin, "27TEST1234F1Z5");
  assert.equal(merged.email, null);
  assert.equal(merged.phone, null);
  assert.equal(merged.customFields.length, 1);
  assert.equal(merged.customFields[0].label, "MSME");
});

test("mergeDocumentBranding does not inject hardcoded tenant defaults", () => {
  const merged = mergeDocumentBranding({});
  assert.equal(merged.gstin, null);
  assert.equal(merged.email, null);
  assert.equal(merged.phone, null);
});

test("normalizeCustomFields drops empty rows", () => {
  const rows = normalizeCustomFields([
    { label: "", value: "" },
    { label: "LUT", value: "AA123", showOnProposal: true },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "LUT");
  assert.equal(rows[0].showOnProposal, true);
});

test("publicProposalDocumentBranding omits bank details and filters custom fields", () => {
  const publicBranding = publicProposalDocumentBranding({
    gstin: "27TEST1234F1Z5",
    bankName: "HDFC",
    bankAccount: "123456",
    bankIfsc: "HDFC0001",
    customFields: [
      { id: "1", label: "Invoice only", value: "A", showOnInvoice: true, showOnProposal: false },
      { id: "2", label: "Proposal", value: "B", showOnInvoice: false, showOnProposal: true },
    ],
  });
  assert.equal(publicBranding.gstin, "27TEST1234F1Z5");
  assert.equal(publicBranding.bankName, null);
  assert.equal(publicBranding.bankAccount, null);
  assert.equal(publicBranding.bankIfsc, null);
  assert.equal(publicBranding.customFields.length, 1);
  assert.equal(publicBranding.customFields[0].label, "Proposal");
});
