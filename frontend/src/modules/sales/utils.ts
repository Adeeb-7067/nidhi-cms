import type { ProposalItem } from "@/api/sales";

export function calcProposalTotal(proposal: { items: ProposalItem[]; discount: number }) {
  let subtotal = 0;
  let tax = 0;
  for (const item of proposal.items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    tax += line * (item.taxPercent / 100);
  }
  const discountFactor = 1 - (proposal.discount ?? 0) / 100;
  subtotal *= discountFactor;
  tax *= discountFactor;
  return { subtotal, tax, total: subtotal + tax };
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
