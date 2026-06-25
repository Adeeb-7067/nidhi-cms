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
