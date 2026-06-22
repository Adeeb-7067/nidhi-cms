import type { BankTransaction } from "../types";

export const mockBankTransactions: BankTransaction[] = [
  { id: 1, date: "2026-06-10", direction: "incoming", mode: "neft", reference: "INV-2026-0420", party: "Bharat FinServ Ltd", amount: 2360000, reconciliationStatus: "matched", bankRef: "NEFT/HDFC/0610123456" },
  { id: 2, date: "2026-06-08", direction: "incoming", mode: "neft", reference: "INV-2026-0405", party: "Dubai FZE", amount: 850000, reconciliationStatus: "matched", bankRef: "NEFT/HDFC/0610987654" },
  { id: 3, date: "2026-06-08", direction: "outgoing", mode: "neft", reference: "PAY-2026-0892", party: "Freshworks Technologies", amount: 72000, reconciliationStatus: "matched", bankRef: "NEFT/HDFC/0610876543" },
  { id: 4, date: "2026-06-05", direction: "incoming", mode: "rtgs", reference: "INV-2026-0398", party: "GreenLeaf Retail LLP", amount: 590000, reconciliationStatus: "matched", bankRef: "RTGS/HDFC/0605123456" },
  { id: 5, date: "2026-06-05", direction: "incoming", mode: "upi", reference: "UNKNOWN", party: "Unidentified UPI", amount: 125000, reconciliationStatus: "unmatched", bankRef: "UPI/0610543210" },
  { id: 6, date: "2026-06-02", direction: "incoming", mode: "neft", reference: "INV-2026-0412", party: "TechNova Solutions", amount: 1180000, reconciliationStatus: "matched", bankRef: "NEFT/HDFC/0602123456" },
  { id: 7, date: "2026-06-01", direction: "outgoing", mode: "neft", reference: "PAY-2026-0880", party: "AWS India Pvt Ltd", amount: 245000, reconciliationStatus: "matched", bankRef: "NEFT/HDFC/0601123456" },
  { id: 8, date: "2026-06-01", direction: "outgoing", mode: "rtgs", reference: "SAL-JUN-2026", party: "Payroll batch", amount: 8420000, reconciliationStatus: "matched", bankRef: "RTGS/HDFC/0601987654" },
  { id: 9, date: "2026-05-28", direction: "incoming", mode: "neft", reference: "UNKNOWN", party: "Suspense credit", amount: 217500, reconciliationStatus: "unmatched", bankRef: "NEFT/HDFC/0528123456" },
  { id: 10, date: "2026-05-25", direction: "outgoing", mode: "upi", reference: "PAY-2026-0865", party: "Office utilities", amount: 28000, reconciliationStatus: "partial", bankRef: "UPI/0525987654" },
  { id: 11, date: "2026-05-22", direction: "incoming", mode: "rtgs", reference: "INV-2026-0371", party: "HealthPlus Diagnostics", amount: 472000, reconciliationStatus: "matched", bankRef: "RTGS/HDFC/0522123456" },
  { id: 12, date: "2026-05-20", direction: "outgoing", mode: "neft", reference: "PAY-2026-0850", party: "Deloitte Haskins", amount: 450000, reconciliationStatus: "matched", bankRef: "NEFT/HDFC/0520123456" },
];

export const bankReconciliationSummary = {
  matched: mockBankTransactions.filter((t) => t.reconciliationStatus === "matched").length,
  unmatched: mockBankTransactions.filter((t) => t.reconciliationStatus === "unmatched").length,
  partial: mockBankTransactions.filter((t) => t.reconciliationStatus === "partial").length,
  incomingTotal: mockBankTransactions.filter((t) => t.direction === "incoming").reduce((s, t) => s + t.amount, 0),
  outgoingTotal: mockBankTransactions.filter((t) => t.direction === "outgoing").reduce((s, t) => s + t.amount, 0),
};
