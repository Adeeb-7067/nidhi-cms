/** Normalize issuer fields stored on sales preferences. */

const STRING_FIELDS = [
  "gstin",
  "email",
  "phone",
  "pan",
  "cin",
  "website",
  "bankName",
  "bankAccount",
  "bankIfsc",
];

function trimOrNull(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function normalizeCustomFields(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, index) => {
      const label = String(row?.label ?? "").trim();
      const value = String(row?.value ?? "").trim();
      if (!label && !value) return null;
      const id = String(row?.id ?? `field-${index + 1}`).trim() || `field-${index + 1}`;
      return {
        id,
        label: label || "Field",
        value,
        showOnInvoice: row?.showOnInvoice !== false,
        showOnReceipt: row?.showOnReceipt !== false,
        showOnProposal: Boolean(row?.showOnProposal),
        showOnStatement: Boolean(row?.showOnStatement),
      };
    })
    .filter(Boolean);
}

/** Merge stored branding without injecting tenant-specific fallbacks. */
export function mergeDocumentBranding(stored) {
  const src = stored && typeof stored === "object" ? stored : {};
  const next = {};
  for (const key of STRING_FIELDS) {
    next[key] = trimOrNull(src[key]);
  }
  next.customFields = normalizeCustomFields(src.customFields);
  return next;
}

/** Public proposal links: contact/tax only — no bank details. */
export function publicProposalDocumentBranding(stored) {
  const merged = mergeDocumentBranding(stored);
  return {
    gstin: merged.gstin,
    email: merged.email,
    phone: merged.phone,
    pan: merged.pan,
    cin: merged.cin,
    website: merged.website,
    bankName: null,
    bankAccount: null,
    bankIfsc: null,
    customFields: merged.customFields.filter((field) => field.showOnProposal),
  };
}
