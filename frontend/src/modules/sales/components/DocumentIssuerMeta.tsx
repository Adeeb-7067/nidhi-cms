import type { ReactNode } from "react";
import type { SalesDocumentBranding, SalesDocumentKind } from "../company-branding";
import { customFieldsForDocument } from "../company-branding";

const subtle = "#9CA3AF";

export function DocumentIssuerMeta({
  branding,
  kind,
  compact = false,
}: {
  branding: SalesDocumentBranding;
  kind: SalesDocumentKind;
  compact?: boolean;
}) {
  const textClass = compact ? "text-[10px]" : "text-xs";
  const extras = customFieldsForDocument(branding, kind);
  const items: ReactNode[] = [];

  if (branding.phone) {
    items.push(
      <span key="phone" className={textClass} style={{ color: "#6B7280" }}>
        {branding.phone}
      </span>,
    );
  }
  if (branding.email) {
    items.push(
      <span key="email" className={textClass} style={{ color: "#6B7280" }}>
        {branding.email}
      </span>,
    );
  }
  if (branding.gstin) {
    items.push(
      <span key="gstin" className={`${textClass} font-mono`} style={{ color: subtle }}>
        GSTIN: {branding.gstin}
      </span>,
    );
  }
  if (branding.pan) {
    items.push(
      <span key="pan" className={`${textClass} font-mono`} style={{ color: subtle }}>
        PAN: {branding.pan}
      </span>,
    );
  }
  if (branding.cin) {
    items.push(
      <span key="cin" className={`${textClass} font-mono`} style={{ color: subtle }}>
        CIN: {branding.cin}
      </span>,
    );
  }
  if (branding.website) {
    items.push(
      <span key="website" className={textClass} style={{ color: "#6B7280" }}>
        {branding.website}
      </span>,
    );
  }
  for (const field of extras) {
    items.push(
      <span key={field.id} className={textClass} style={{ color: subtle }}>
        {field.label}: {field.value}
      </span>,
    );
  }

  if (items.length === 0) return null;

  return <div className={`flex flex-wrap gap-2 ${compact ? "mt-1" : "mt-2"}`}>{items}</div>;
}

export function DocumentBankDetails({
  branding,
  compact = false,
}: {
  branding: SalesDocumentBranding;
  compact?: boolean;
}) {
  if (!branding.bankName && !branding.bankAccount && !branding.bankIfsc) return null;
  const textClass = compact ? "text-[10px]" : "text-xs";
  return (
    <div className={`rounded-lg border px-3 py-2 ${compact ? "mt-3" : "mt-4"}`} style={{ borderColor: "#E5E7EB" }}>
      <p className={`${textClass} font-semibold uppercase tracking-wide`} style={{ color: "#6B7280" }}>
        Bank details
      </p>
      {branding.bankName ? (
        <p className={`${textClass} mt-1`} style={{ color: "#111928" }}>{branding.bankName}</p>
      ) : null}
      {branding.bankAccount ? (
        <p className={`${textClass} font-mono`} style={{ color: "#374151" }}>
          A/C: {branding.bankAccount}
        </p>
      ) : null}
      {branding.bankIfsc ? (
        <p className={`${textClass} font-mono`} style={{ color: "#374151" }}>
          IFSC: {branding.bankIfsc}
        </p>
      ) : null}
    </div>
  );
}
