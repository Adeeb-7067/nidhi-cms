import { format } from "date-fns";
import { COMPANY_BILLING, calcRemaining, formatCurrency } from "../constants";
import { numberToWords, formatSalesDateTime } from "../utils";
import type { DocumentCompanyBranding } from "../company-branding";
import type { PartialPayment, SalesInvoice } from "../types";

const primary = "#1A56DB";
const orange = "#E8630A";
const dark = "#111928";
const muted = "#6B7280";
const subtle = "#9CA3AF";
const border = "#E5E7EB";
const rowAlt = "#F9FAFB";

const INVOICE_STATUS: Record<string, { label: string; chip: string; text: string }> = {
  paid: { label: "Paid", chip: "#ECFDF5", text: "#057A55" },
  unpaid: { label: "Unpaid", chip: "#FFFBEB", text: "#B45309" },
  partial: { label: "Partially paid", chip: "#EFF6FF", text: primary },
  overdue: { label: "Overdue", chip: "#FEF2F2", text: "#C81E1E" },
  cancelled: { label: "Cancelled", chip: "#F3F4F6", text: "#4B5563" },
};

function DocRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs flex-shrink-0" style={{ color: subtle }}>{label}</span>
      <span
        className={`text-xs font-semibold text-right min-w-0 break-words ${mono ? "font-mono" : ""}`}
        style={{ color: dark }}
      >
        {value}
      </span>
    </div>
  );
}

export function InvoiceDocument({
  invoice,
  company,
  customerContact,
  customerEmail,
  customerPhone,
  customerLocation,
  payments = [],
  compact = false,
}: {
  invoice: SalesInvoice;
  company?: DocumentCompanyBranding;
  customerContact?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerLocation?: string;
  payments?: PartialPayment[];
  /** Tighter layout for single-page PDF export. */
  compact?: boolean;
}) {
  const remaining = calcRemaining(invoice.amount, invoice.paidAmount);
  const statusCfg = INVOICE_STATUS[invoice.status] ?? INVOICE_STATUS.unpaid;
  const branding = company ?? {
    companyName: COMPANY_BILLING.name,
    address: COMPANY_BILLING.address,
    logoUrl: null,
    sealUrl: null,
  };

  const padX = compact ? "px-5" : "px-8";
  const padYHead = compact ? "py-4" : "py-7";
  const padYSection = compact ? "py-4" : "py-6";
  const logoH = compact ? "h-10" : "h-14";
  const logoBox = compact ? "h-10 w-10 text-base" : "h-14 w-14 text-xl";
  const titleSize = compact ? "text-2xl" : "text-3xl";
  const maxPaymentRows = compact ? 4 : payments.length;
  const visiblePayments = payments.slice(0, maxPaymentRows);
  const hiddenPaymentCount = payments.length - visiblePayments.length;
  const lineItems = invoice.lineItems ?? [];

  return (
    <div
      className={`rounded-2xl shadow-sm bg-white ${compact ? "overflow-visible" : "overflow-hidden"}`}
      style={{ border: `1px solid ${border}`, fontFamily: "system-ui, sans-serif" }}
    >
      {/* Letterhead */}
      <div
        className={`flex items-start justify-between gap-6 ${padX} ${padYHead}`}
        style={{ borderBottom: `3px solid ${primary}` }}
      >
        <div className="flex items-start gap-4 min-w-0">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.companyName} logo`}
              className={`${logoH} w-auto max-w-[140px] object-contain flex-shrink-0`}
            />
          ) : (
            <div
              className={`${logoBox} rounded-xl flex items-center justify-center text-white font-black flex-shrink-0`}
              style={{ background: primary }}
            >
              SK
            </div>
          )}
          <div className="min-w-0">
            <h2 className={`font-extrabold leading-tight ${compact ? "text-base" : "text-lg"}`} style={{ color: dark }}>
              {branding.companyName}
            </h2>
            <p className={`${compact ? "text-[10px]" : "text-xs"} mt-1 leading-relaxed`} style={{ color: muted }}>
              {branding.address}
            </p>
            <div className={`flex flex-wrap gap-2 ${compact ? "mt-1" : "mt-2"}`}>
              <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: muted }}>{COMPANY_BILLING.phone}</span>
              <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: muted }}>{COMPANY_BILLING.email}</span>
              <span className={`${compact ? "text-[10px]" : "text-xs"} font-mono`} style={{ color: subtle }}>
                GSTIN: {COMPANY_BILLING.gstin}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p
            className={`${titleSize} font-black uppercase tracking-wide`}
            style={{ color: primary, letterSpacing: "0.05em" }}
          >
            Tax Invoice
          </p>
          <p className="text-sm font-mono font-semibold mt-1" style={{ color: muted }}>
            {invoice.number}
          </p>
        </div>
      </div>

      {/* Bill to / details */}
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ borderBottom: `1px solid ${border}` }}>
        <div className={`${padX} ${padYSection}`} style={{ borderRight: `1px solid ${border}` }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: primary }}>
            Bill To
          </p>
          <p className="text-sm font-bold" style={{ color: dark }}>{invoice.customer}</p>
          {customerContact && customerContact !== invoice.customer && (
            <p className="text-xs mt-1" style={{ color: muted }}>Attn: {customerContact}</p>
          )}
          {customerEmail && <p className="text-xs mt-1" style={{ color: muted }}>{customerEmail}</p>}
          {customerPhone && <p className="text-xs mt-0.5" style={{ color: muted }}>{customerPhone}</p>}
          {customerLocation && <p className="text-xs mt-0.5" style={{ color: muted }}>{customerLocation}</p>}
        </div>
        <div className={`${padX} ${padYSection}`}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: primary }}>
            Invoice Details
          </p>
          <div className="space-y-2.5">
            <DocRow label="Invoice No." value={invoice.number} mono />
            <DocRow label="Issue Date" value={formatSalesDateTime(invoice.createdAt)} />
            <DocRow label="Due Date" value={format(new Date(invoice.dueDate), "dd MMM yyyy")} />
            {invoice.projectName && <DocRow label="Project" value={invoice.projectName} />}
            {invoice.installmentName && <DocRow label="Installment" value={invoice.installmentName} />}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs" style={{ color: subtle }}>Status</span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: statusCfg.chip, color: statusCfg.text }}
              >
                {statusCfg.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: dark }}>
              {lineItems.length > 0 && (
                <th
                  className={`text-center ${compact ? "py-2 px-3" : "py-3.5 px-5"} text-[10px] font-black uppercase tracking-widest w-12`}
                  style={{ color: "#9CA3AF" }}
                >
                  #
                </th>
              )}
              <th
                className={`text-left ${compact ? "py-2 px-4" : "py-3.5 px-6"} text-[10px] font-black uppercase tracking-widest`}
                style={{ color: "#fff" }}
              >
                Description
              </th>
              {lineItems.length > 0 && (
                <>
                  <th className={`text-right ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#9CA3AF" }}>Qty</th>
                  <th className={`text-right ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#9CA3AF" }}>Rate</th>
                  <th className={`text-right ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#9CA3AF" }}>Tax</th>
                </>
              )}
              <th
                className={`text-right ${compact ? "py-2 px-4" : "py-3.5 px-6"} text-[10px] font-black uppercase tracking-widest w-36`}
                style={{ color: "#fff" }}
              >
                Amount (INR)
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? (
              lineItems.map((item, idx) => {
                const line = item.quantity * item.unitPrice;
                const lineTax = line * (item.taxPercent / 100);
                return (
                  <tr
                    key={item.itemId ?? idx}
                    style={{ background: idx % 2 === 0 ? "#fff" : rowAlt, borderBottom: `1px solid ${border}` }}
                  >
                    <td className={`text-center ${compact ? "py-2 px-3" : "py-4 px-5"} text-xs font-bold tabular-nums align-top`} style={{ color: primary }}>
                      {idx + 1}
                    </td>
                    <td className={compact ? "py-2 px-4" : "py-4 px-6"}>
                      <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`} style={{ color: dark }}>
                        {item.name || "—"}
                      </p>
                      {item.description && (
                        <p className="text-xs mt-1 leading-relaxed break-words" style={{ color: muted }}>
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className={`${compact ? "py-2 px-3" : "py-4 px-4"} text-right tabular-nums align-top`} style={{ color: muted }}>
                      {item.quantity}
                    </td>
                    <td className={`${compact ? "py-2 px-3" : "py-4 px-4"} text-right tabular-nums align-top`} style={{ color: muted }}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className={`${compact ? "py-2 px-3" : "py-4 px-4"} text-right text-xs align-top`} style={{ color: subtle }}>
                      {item.taxPercent > 0 ? `GST ${item.taxPercent}%` : "—"}
                    </td>
                    <td className={`${compact ? "py-2 px-4" : "py-4 px-6"} text-right font-bold tabular-nums align-top`} style={{ color: dark }}>
                      {formatCurrency(line + lineTax)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr style={{ background: "#fff", borderBottom: `1px solid ${border}` }}>
                <td className={compact ? "py-3 px-4" : "py-5 px-6"}>
                  <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`} style={{ color: dark }}>
                    {invoice.installmentName
                      ? `Billing — ${invoice.installmentName}`
                      : invoice.projectName
                        ? `Professional services — ${invoice.projectName}`
                        : "Professional services as per agreement"}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: muted }}>
                    Invoice {invoice.number}
                    {invoice.installmentName ? ` · ${invoice.installmentName}` : ""}
                  </p>
                </td>
                <td className={`${compact ? "py-3 px-4" : "py-5 px-6"} text-right font-bold tabular-nums align-top`} style={{ color: dark }}>
                  {formatCurrency(invoice.amount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className={`${padX} ${padYSection} flex justify-end`} style={{ borderTop: `1px solid ${border}` }}>
        <div className="w-full max-w-xs space-y-2.5">
          <div className="flex justify-between text-sm">
            <span style={{ color: muted }}>Invoice amount</span>
            <span className="font-semibold tabular-nums" style={{ color: dark }}>
              {formatCurrency(invoice.amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: muted }}>Amount received</span>
            <span className="font-semibold tabular-nums" style={{ color: "#057A55" }}>
              {formatCurrency(invoice.paidAmount)}
            </span>
          </div>
          <div
            className={`flex items-center justify-between ${compact ? "mt-2 px-4 py-3" : "mt-3 px-5 py-4"} rounded-xl`}
            style={{ background: dark }}
          >
            <span className="text-sm font-semibold" style={{ color: "#9CA3AF" }}>
              Balance due
            </span>
            <span className={`${compact ? "text-base" : "text-xl"} font-black tabular-nums`} style={{ color: orange }}>
              {formatCurrency(remaining)}
            </span>
          </div>
          <div
            className="mt-3 px-4 py-3 rounded-xl"
            style={{ background: `${primary}08`, border: `1px solid ${primary}20` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: primary }}>
              Amount in words
            </p>
            <p className="text-xs italic mt-1 leading-relaxed" style={{ color: dark }}>
              {numberToWords(remaining > 0 ? remaining : invoice.amount)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {visiblePayments.length > 0 && (
        <div className={`${padX} ${padYSection}`} style={{ borderTop: `1px solid ${border}`, background: rowAlt }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: primary }}>
            Payment history
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#fff" }}>
                  <th className={`text-left ${compact ? "py-1.5 px-3" : "py-2.5 px-4"} font-semibold`} style={{ color: subtle }}>Date</th>
                  <th className={`text-left ${compact ? "py-1.5 px-3" : "py-2.5 px-4"} font-semibold`} style={{ color: subtle }}>Receipt</th>
                  <th className={`text-left ${compact ? "py-1.5 px-3" : "py-2.5 px-4"} font-semibold`} style={{ color: subtle }}>Mode</th>
                  <th className={`text-right ${compact ? "py-1.5 px-3" : "py-2.5 px-4"} font-semibold`} style={{ color: subtle }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {visiblePayments.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{
                      background: idx % 2 === 0 ? "#fff" : rowAlt,
                      borderTop: `1px solid ${border}`,
                    }}
                  >
                    <td className={compact ? "py-1.5 px-3" : "py-2.5 px-4"} style={{ color: dark }}>
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </td>
                    <td className={`${compact ? "py-1.5 px-3" : "py-2.5 px-4"} font-mono`} style={{ color: muted }}>
                      {p.receiptNumber ?? "—"}
                    </td>
                    <td className={compact ? "py-1.5 px-3" : "py-2.5 px-4"} style={{ color: muted }}>{p.mode}</td>
                    <td className={`${compact ? "py-1.5 px-3" : "py-2.5 px-4"} text-right font-semibold tabular-nums`} style={{ color: dark }}>
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hiddenPaymentCount > 0 && (
            <p className="text-[10px] mt-1.5" style={{ color: muted }}>
              + {hiddenPaymentCount} more payment{hiddenPaymentCount === 1 ? "" : "s"} on file
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className={`${padX} ${compact ? "py-4" : "py-6"} flex items-end justify-between gap-6`}
        style={{ borderTop: `1px dashed ${border}`, background: rowAlt }}
      >
        <div className="space-y-3 text-xs" style={{ color: muted }}>
          <p>
            <span className="font-semibold" style={{ color: dark }}>Payment terms:</span>{" "}
            Due by {format(new Date(invoice.dueDate), "dd MMMM yyyy")}. Please quote invoice number on remittance.
          </p>
          <p>Thank you for your business.</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: subtle }}>
            Authorised seal
          </p>
          <p className="text-xs font-semibold" style={{ color: dark }}>{branding.companyName}</p>
          {branding.sealUrl && (
            <img
              src={branding.sealUrl}
              alt="Official seal"
              className={`${compact ? "h-14 w-14" : "h-20 w-20"} object-contain ml-auto mt-3`}
              style={{ opacity: 0.92 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
