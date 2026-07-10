import type { FinanceVendor, FinanceVendorField } from "@/api/finance";

export function formatVendorFieldsSummary(
  fields?: FinanceVendorField[] | null,
  notes?: string | null,
  max = 2,
): string {
  const rows = (fields ?? []).filter((f) => f.label?.trim() && f.value?.trim());
  if (rows.length) {
    return rows
      .slice(0, max)
      .map((f) => `${f.label}: ${f.value}`)
      .join(" · ");
  }
  const trimmed = notes?.trim();
  return trimmed ? trimmed : "—";
}

export function vendorPrimaryService(fields?: FinanceVendorField[] | null): string | null {
  const rows = (fields ?? []).filter((f) => f.label?.trim() && f.value?.trim());
  if (!rows.length) return null;
  const serviceLike = rows.find((f) => /service|hosting|cloud|platform|provider/i.test(f.label));
  return (serviceLike ?? rows[0]).value;
}

export function ensureHttpUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function vendorToFormDefaults(vendor?: FinanceVendor | null) {
  return {
    name: vendor?.name ?? "",
    email: vendor?.email ?? "",
    contactPerson: vendor?.contactPerson ?? "",
    phone: vendor?.phone ?? "",
    address: vendor?.address ?? "",
    website: vendor?.website ?? "",
    gstin: vendor?.gstin ?? "",
    notes: vendor?.notes ?? "",
    fields: vendor?.fields?.length
      ? vendor.fields.map((f) => ({ label: f.label, value: f.value }))
      : [{ label: "", value: "" }],
  };
}
