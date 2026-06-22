import type { SuspenseEntry } from "../types";

export const mockSuspenseEntries: SuspenseEntry[] = [
  { id: 1, receivedAt: "2026-06-05", amount: 125000, bankRef: "UPI/0610543210", mode: "upi", remarks: "No invoice reference — payer name truncated", ageDays: 7 },
  { id: 2, receivedAt: "2026-05-28", amount: 217500, bankRef: "NEFT/HDFC/0528123456", mode: "neft", remarks: "Partial payment — client TBD", ageDays: 15 },
  { id: 3, receivedAt: "2026-05-12", amount: 85000, bankRef: "NEFT/HDFC/0512987654", mode: "neft", remarks: "Advance from unknown party", ageDays: 31 },
  { id: 4, receivedAt: "2026-04-20", amount: 45000, bankRef: "RTGS/HDFC/0420123456", mode: "rtgs", remarks: "Refund reversal — origin unclear", ageDays: 53 },
];

export const totalSuspenseAmount = mockSuspenseEntries.reduce((s, e) => s + e.amount, 0);
