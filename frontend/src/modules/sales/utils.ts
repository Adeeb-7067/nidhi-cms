import { format } from "date-fns";
import type { ProposalItem } from "@/api/sales";

export const SALES_DATETIME_FORMAT = "MMM d, yyyy · h:mm a";

export function formatSalesDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, SALES_DATETIME_FORMAT);
}

/** Calendar payment date from record-payment forms (date-only, no time). */
export function formatSalesPaymentDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

export function formatProjectLabel(projectId?: number | null, projectName?: string | null): string {
  if (!projectId && !projectName) return "—";
  return projectName?.trim() || (projectId ? `Project #${projectId}` : "—");
}

/** Per-payment paid invoice (installment partials); falls back to the main invoice link. */
export function paymentDocumentInvoiceId(p: { paymentInvoiceId?: number | null; invoiceId: number }) {
  return p.paymentInvoiceId ?? p.invoiceId;
}

export function formatInstallmentSequence(
  sequenceNumber?: number | null,
  sequenceTotal?: number | null,
): string | null {
  if (!sequenceNumber) return null;
  if (sequenceTotal && sequenceTotal > 1) {
    return `Installment ${sequenceNumber} of ${sequenceTotal}`;
  }
  return `Installment ${sequenceNumber}`;
}

export function isProposalValidityActive(validUntil?: string | null): boolean {
  if (!validUntil) return true;
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return true;
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= Date.now();
}

export function canClientRespondToProposal(proposal: {
  status: string;
  validUntil?: string | null;
  sentAt?: string | null;
}): boolean {
  if (["approved", "declined"].includes(proposal.status)) return false;
  if (proposal.status === "draft") return false;
  if (["sent", "seen"].includes(proposal.status)) return true;
  if (!isProposalValidityActive(proposal.validUntil)) return false;
  if (proposal.status === "expired") return true;
  if (proposal.status === "revised" && proposal.sentAt) return true;
  return false;
}

export function calcProposalTotal(proposal: { items: ProposalItem[]; discount: number }) {
  let grossSubtotal = 0;
  let grossTax = 0;
  for (const item of proposal.items) {
    const line = item.quantity * item.unitPrice;
    grossSubtotal += line;
    grossTax += line * (item.taxPercent / 100);
  }
  const discountPct = proposal.discount ?? 0;
  const discountFactor = 1 - discountPct / 100;
  const subtotal = grossSubtotal * discountFactor;
  const tax = grossTax * discountFactor;
  const grossTotal = grossSubtotal + grossTax;
  const total = subtotal + tax;
  return {
    grossSubtotal: Math.round(grossSubtotal),
    grossTax: Math.round(grossTax),
    grossTotal: Math.round(grossTotal),
    subtotal: Math.round(subtotal),
    tax: Math.round(tax),
    total: Math.round(total),
    discountAmount: Math.round(grossTotal - total),
  };
}

export function formatDiscountPercent(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

export function resolveFinalTotal(
  calculated: number,
  totalAdjustment = 0,
  adjustedTotal: number | null = null,
): number {
  const base = Math.round(calculated || 0);
  if (adjustedTotal != null && !Number.isNaN(adjustedTotal)) {
    return Math.max(0, Math.round(adjustedTotal));
  }
  return Math.max(0, Math.round(base + (totalAdjustment || 0)));
}

export function resolveProposalTotal(proposal: {
  items: ProposalItem[];
  discount: number;
  totalAdjustment?: number;
  adjustedTotal?: number | null;
}) {
  const breakdown = calcProposalTotal(proposal);
  const finalTotal = resolveFinalTotal(
    breakdown.total,
    proposal.totalAdjustment ?? 0,
    proposal.adjustedTotal ?? null,
  );
  return {
    ...breakdown,
    calculated: breakdown.total,
    finalTotal,
    adjustmentDelta: finalTotal - breakdown.total,
  };
}

export function calcInvoiceLineBreakdown(items: ProposalItem[], gstEnabled = true) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    if (gstEnabled) tax += line * (item.taxPercent / 100);
  }
  return {
    subtotal: Math.round(subtotal),
    tax: Math.round(tax),
    total: Math.round(subtotal + tax),
  };
}

export function resolveInvoiceTotal(invoice: {
  lineItems?: ProposalItem[];
  amount: number;
  calculatedAmount?: number | null;
  totalAdjustment?: number;
  adjustedTotal?: number | null;
  gstEnabled?: boolean;
}) {
  const gstEnabled = invoice.gstEnabled !== false;
  const items = invoice.lineItems ?? [];
  const fromLines = items.length > 0 ? calcInvoiceLineBreakdown(items, gstEnabled) : null;
  const calculated = Math.round(invoice.calculatedAmount ?? fromLines?.total ?? invoice.amount);
  const finalTotal = Math.round(invoice.amount);
  return {
    subtotal: fromLines?.subtotal ?? calculated,
    tax: fromLines?.tax ?? 0,
    calculated,
    finalTotal,
    adjustmentDelta: finalTotal - calculated,
    hasLineItems: items.length > 0,
    hasCustomTotal: invoice.adjustedTotal != null,
    totalAdjustment: invoice.totalAdjustment ?? 0,
    gstEnabled,
  };
}

export function numberToWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  }

  const rounded = Math.round(Math.abs(amount));
  if (rounded === 0) return "Zero Rupees Only";
  return inWords(rounded).trim() + " Rupees Only";
}

export function readSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
};

export function formatPaymentMethod(method: string) {
  return METHOD_LABELS[method] ?? method;
}
