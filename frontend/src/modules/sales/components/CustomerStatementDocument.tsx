import { format } from "date-fns";
import type { Customer } from "@/api/sales";
import type { SalesDocumentBranding } from "@/modules/sales/company-branding";
import {
  formatStatementSummaryAmount,
  formatStatementTableAmount,
  type StatementLedger,
} from "@/modules/sales/customer-statement-ledger";
import { DocumentIssuerMeta } from "@/modules/sales/components/DocumentIssuerMeta";

/** Always-readable statement colors (forced light doc, works in dark app theme). */
const primary = "#1A56DB";
const ink = "#111827";
const muted = "#4B5563";
const subtle = "#6B7280";
const border = "#E5E7EB";
const headerBg = "#1F2937";
const rowAlt = "#F9FAFB";
const beginBg = "#F3F4F6";
const amountRed = "#B91C1C";
const paymentGreen = "#047857";
const dueRed = "#DC2626";

export type StatementDocRow = {
  key: string;
  date: string;
  details: string;
  href?: string;
  amount: number;
  payment: number;
  balance: number;
  isBeginning?: boolean;
  isEmpty?: boolean;
};

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function CustomerStatementDocument({
  customer,
  company,
  ledger,
  periodLabel,
  showingText,
  rows,
  documentRef,
}: {
  customer: Customer;
  company: SalesDocumentBranding;
  ledger: StatementLedger;
  periodLabel: string;
  showingText: string;
  rows: StatementDocRow[];
  documentRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={documentRef}
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{ background: "#FFFFFF", color: ink, borderColor: border, fontFamily: "system-ui, sans-serif" }}
    >
      {/* Letterhead — matches invoice/proposal branding */}
      <div
        className="flex items-start justify-between gap-6 px-8 py-7"
        style={{ borderBottom: `3px solid ${primary}` }}
      >
        <div className="flex min-w-0 items-start gap-4">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={`${company.companyName} logo`}
              className="h-14 w-auto max-w-[140px] flex-shrink-0 object-contain"
            />
          ) : (
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-xl font-black text-white"
              style={{ background: primary }}
            >
              {companyInitials(company.companyName)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold leading-tight" style={{ color: ink }}>
              {company.companyName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: muted }}>
              {company.address}
            </p>
            <DocumentIssuerMeta branding={company} kind="statement" />
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p
            className="text-3xl font-black uppercase tracking-wide"
            style={{ color: primary, letterSpacing: "0.05em" }}
          >
            Statement
          </p>
          <p className="mt-1 text-xs tabular-nums" style={{ color: subtle }}>
            {periodLabel}
          </p>
        </div>
      </div>

      <div className="space-y-6 px-8 py-6 pb-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-1">
            <p
              className="mb-2 text-[10px] font-black uppercase tracking-widest"
              style={{ color: primary }}
            >
              To
            </p>
            <p className="text-sm font-bold" style={{ color: ink }}>
              {customer.companyName}
            </p>
            {customer.location ? (
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: muted }}>
                {customer.location}
              </p>
            ) : null}
            {customer.gstin ? (
              <p className="font-mono text-xs" style={{ color: muted }}>
                GSTIN: {customer.gstin}
              </p>
            ) : null}
            {customer.email ? (
              <p className="text-xs" style={{ color: muted }}>
                {customer.email}
              </p>
            ) : null}
            {customer.phone ? (
              <p className="text-xs" style={{ color: muted }}>
                {customer.phone}
              </p>
            ) : null}
          </div>

          <div
            className="rounded-lg p-4"
            style={{ background: rowAlt, border: `1px solid ${border}` }}
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-sm font-bold" style={{ color: ink }}>
                Account Summary
              </p>
              <p className="text-[11px] tabular-nums" style={{ color: subtle }}>
                {periodLabel}
              </p>
            </div>
            <SummaryRow label="Beginning Balance" value={formatStatementSummaryAmount(ledger.beginningBalance)} />
            <SummaryRow label="Invoiced Amount" value={formatStatementSummaryAmount(ledger.invoicedInPeriod)} />
            <SummaryRow label="Amount Paid" value={formatStatementSummaryAmount(ledger.paidInPeriod)} />
            <SummaryRow
              label="Balance Due"
              value={formatStatementSummaryAmount(ledger.balanceDue)}
              emphasize
              alert={ledger.balanceDue > 0}
            />
          </div>
        </div>

        <p className="text-center text-[11px]" style={{ color: subtle }}>
          {showingText}
        </p>

        <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${border}` }}>
          <table className="w-full border-collapse text-xs" style={{ color: ink }}>
            <thead>
              <tr style={{ background: headerBg, color: "#FFFFFF" }}>
                <th className="px-3 py-2.5 text-left font-semibold tracking-wide">Date</th>
                <th className="px-3 py-2.5 text-left font-semibold tracking-wide">Details</th>
                <th className="px-3 py-2.5 text-right font-semibold tracking-wide">Amount</th>
                <th className="px-3 py-2.5 text-right font-semibold tracking-wide">Payments</th>
                <th className="px-3 py-2.5 text-right font-semibold tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                if (row.isEmpty) {
                  return (
                    <tr key={row.key}>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center"
                        style={{ color: subtle, background: "#FFFFFF" }}
                      >
                        {row.details}
                      </td>
                    </tr>
                  );
                }
                const bg = row.isBeginning ? beginBg : idx % 2 === 0 ? "#FFFFFF" : rowAlt;
                return (
                  <tr key={row.key} style={{ background: bg }}>
                    <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums" style={{ color: muted }}>
                      {row.date}
                    </td>
                    <td className="px-3 py-2.5 align-top leading-relaxed" style={{ color: ink }}>
                      {row.href && !row.isBeginning ? (
                        <a href={row.href} className="underline-offset-2 hover:underline" style={{ color: "#1D4ED8" }}>
                          {row.details}
                        </a>
                      ) : (
                        row.details
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 align-top text-right tabular-nums"
                      style={{ color: amountRed }}
                    >
                      {row.amount > 0
                        ? formatStatementTableAmount(row.amount)
                        : row.isBeginning
                          ? "—"
                          : ""}
                    </td>
                    <td
                      className="px-3 py-2.5 align-top text-right tabular-nums"
                      style={{ color: paymentGreen }}
                    >
                      {row.payment > 0
                        ? formatStatementTableAmount(row.payment)
                        : row.isBeginning
                          ? "—"
                          : ""}
                    </td>
                    <td
                      className="px-3 py-2.5 align-top text-right font-medium tabular-nums"
                      style={{ color: ink }}
                    >
                      {formatStatementTableAmount(row.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p
          className="pt-2 text-right text-sm font-bold"
          style={{ color: ledger.balanceDue > 0 ? dueRed : ink }}
        >
          Balance Due {formatStatementSummaryAmount(ledger.balanceDue)}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasize,
  alert,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-1.5 text-xs"
      style={{ borderBottom: emphasize ? "none" : `1px solid ${border}` }}
    >
      <span style={{ color: muted }}>{label}</span>
      <span
        className={`tabular-nums ${emphasize ? "text-sm font-bold" : "font-medium"}`}
        style={{ color: alert ? dueRed : ink }}
      >
        {value}
      </span>
    </div>
  );
}

export function buildStatementDocRows(
  ledger: StatementLedger,
  fromDate: string,
  fallbackDateIso?: string,
): StatementDocRow[] {
  const beginningDate =
    fromDate ||
    (fallbackDateIso ? format(new Date(fallbackDateIso), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));

  const rows: StatementDocRow[] = [
    {
      key: "__beginning",
      date: beginningDate,
      details: "Beginning Balance",
      amount: 0,
      payment: 0,
      balance: ledger.beginningBalance,
      isBeginning: true,
    },
  ];

  if (ledger.rows.length === 0) {
    rows.push({
      key: "__empty",
      date: "",
      details: "No transactions in the selected period",
      amount: 0,
      payment: 0,
      balance: 0,
      isEmpty: true,
    });
    return rows;
  }

  rows.push(
    ...ledger.rows.map((row) => ({
      key: row.key,
      date: format(new Date(row.date), "yyyy-MM-dd"),
      details: row.details,
      href: row.href,
      amount: row.amount,
      payment: row.payment,
      balance: row.balance,
    })),
  );
  return rows;
}
