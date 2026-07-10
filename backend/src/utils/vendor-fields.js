import { optionalString } from "./route-errors.js";

export function normalizeVendorFields(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      label: optionalString(row?.label)?.trim() ?? "",
      value: optionalString(row?.value)?.trim() ?? "",
    }))
    .filter((row) => row.label && row.value);
}

export function resolveVendorFields(doc) {
  const stored = normalizeVendorFields(doc?.vendorFields);
  if (stored.length) return stored;
  const legacy = optionalString(doc?.vendorCategory)?.trim();
  return legacy ? [{ label: "Service", value: legacy }] : [];
}

export function toFinanceVendorDto(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.companyName,
    contactPerson: doc.contactPerson ?? null,
    email: doc.email,
    phone: doc.phone ?? null,
    address: doc.address ?? null,
    website: doc.website ?? null,
    gstin: doc.gstNumber ?? null,
    notes: doc.vendorNotes ?? null,
    fields: resolveVendorFields(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
