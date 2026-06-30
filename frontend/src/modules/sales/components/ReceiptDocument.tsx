import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { COMPANY_BILLING, formatCurrency } from "../constants";
import { numberToWords } from "../utils";
import type { PaymentReceipt } from "../types";

const primary = "#1A56DB";
const green = "#057A55";
const dark = "#111928";
const muted = "#6B7280";
const subtle = "#9CA3AF";
const border = "#E5E7EB";
const rowAlt = "#F9FAFB";

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: `1px solid ${border}` }}>
      <span className="text-xs flex-shrink-0" style={{ color: subtle }}>{label}</span>
      <span
        className={`text-xs font-semibold text-right break-words min-w-0 ${mono ? "font-mono" : ""}`}
        style={{ color: dark }}
      >
        {value}
      </span>
    </div>
  );
}

export function ReceiptDocument({ receipt }: { receipt: PaymentReceipt }) {
  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl overflow-hidden shadow-sm bg-white"
      style={{ border: `1px solid ${border}`, fontFamily: "system-ui, sans-serif" }}
    >
      <div className="px-8 py-7" style={{ borderBottom: `3px solid ${primary}` }}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            {receipt.logoUrl ? (
              <img
                src={receipt.logoUrl}
                alt={`${receipt.companyName} logo`}
                className="h-12 w-auto max-w-[120px] object-contain flex-shrink-0"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ background: primary }}
              >
                SK
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-extrabold text-lg leading-tight" style={{ color: dark }}>
                {receipt.companyName}
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: muted }}>
                {receipt.companyAddress}
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: subtle }}>
                GSTIN: {receipt.companyGstin}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className="text-2xl font-black uppercase tracking-wide"
              style={{ color: primary, letterSpacing: "0.04em" }}
            >
              Receipt
            </p>
            <p className="text-sm font-mono font-semibold mt-1" style={{ color: muted }}>
              {receipt.number}
            </p>
          </div>
        </div>
        <div
          className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{ background: "#ECFDF5", border: `1px solid #BBF7D0` }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: green }} />
          <span className="text-sm font-semibold" style={{ color: green }}>
            Payment received
          </span>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: primary }}>
              Receipt date
            </p>
            <p className="text-sm font-semibold" style={{ color: dark }}>
              {format(new Date(receipt.generatedAt), "dd MMM yyyy")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: primary }}>
              Invoice reference
            </p>
            <p className="text-sm font-mono font-semibold" style={{ color: dark }}>
              {receipt.invoiceNumber}
            </p>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
          <DetailRow label="Customer" value={receipt.customerName} />
          <DetailRow label="Project" value={receipt.projectName} />
          <DetailRow label="Installment" value={receipt.installmentName} />
          <DetailRow label="Payment mode" value={receipt.paymentMethod} />
          <DetailRow label="Transaction ID" value={receipt.transactionId} mono />
        </div>

        <div
          className="rounded-xl px-6 py-5 text-center"
          style={{ background: "#ECFDF5", border: `1px solid #BBF7D0` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: green }}>
            Amount received
          </p>
          <p className="text-3xl font-black tabular-nums mt-2" style={{ color: green }}>
            {formatCurrency(receipt.amountPaid)}
          </p>
          <p className="text-xs mt-3" style={{ color: muted }}>
            Remaining invoice balance:{" "}
            <span className="font-semibold" style={{ color: dark }}>
              {formatCurrency(receipt.remainingBalance)}
            </span>
          </p>
        </div>

        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: `${primary}08`, border: `1px solid ${primary}20` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: primary }}>
            Amount in words
          </p>
          <p className="text-xs italic mt-1 leading-relaxed" style={{ color: dark }}>
            {numberToWords(receipt.amountPaid)}
          </p>
        </div>
      </div>

      <div
        className="px-8 py-6 flex items-end justify-between gap-6"
        style={{ borderTop: `1px dashed ${border}`, background: rowAlt }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-6" style={{ color: subtle }}>
            Received by
          </p>
          <div className="h-px w-36 mb-2" style={{ background: muted }} />
          <p className="text-xs font-semibold" style={{ color: dark }}>{receipt.companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: subtle }}>
            Company seal
          </p>
          {receipt.sealUrl ? (
            <img
              src={receipt.sealUrl}
              alt="Official seal"
              className="h-16 w-16 object-contain ml-auto"
              style={{ opacity: 0.92 }}
            />
          ) : (
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center ml-auto"
              style={{ border: `2px dashed ${subtle}` }}
            >
              <span className="text-[8px] text-center" style={{ color: subtle }}>SEAL</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-4 text-center text-[11px]" style={{ borderTop: `1px solid ${border}`, color: subtle }}>
        {COMPANY_BILLING.phone} · {COMPANY_BILLING.email}
      </div>
    </div>
  );
}
