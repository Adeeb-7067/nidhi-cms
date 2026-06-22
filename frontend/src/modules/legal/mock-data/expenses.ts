import type { LegalExpense } from "../types";

export const mockLegalExpenses: LegalExpense[] = [
  {
    id: 901,
    date: "2026-06-08",
    category: "counsel_fees",
    description: "LexCorp — arbitration hearing prep (SecureLogix)",
    amount: 75000,
    matterRef: "VND-2023-0045",
    approvedBy: "CFO",
    receiptAttached: true,
  },
  {
    id: 902,
    date: "2026-06-05",
    category: "court_fees",
    description: "Filing fee — CS/2026/0201 cheque bounce case",
    amount: 8500,
    matterRef: "CS/2026/0201",
    approvedBy: "Legal Head",
    receiptAttached: true,
  },
  {
    id: 903,
    date: "2026-05-28",
    category: "notary",
    description: "Notarization — batch employee NDAs Q2",
    amount: 4200,
    matterRef: "NDA-BATCH-Q2",
    approvedBy: "HR Director",
    receiptAttached: true,
  },
  {
    id: 904,
    date: "2026-05-20",
    category: "arbitration",
    description: "Arbitration tribunal sitting fee",
    amount: 45000,
    matterRef: "VND-2023-0045",
    approvedBy: "CFO",
    receiptAttached: true,
  },
  {
    id: 905,
    date: "2026-05-15",
    category: "travel",
    description: "Court appearance — High Court MP Bench",
    amount: 6800,
    matterRef: "WP/2026/0312",
    approvedBy: "Legal Head",
    receiptAttached: false,
  },
  {
    id: 906,
    date: "2026-05-10",
    category: "counsel_fees",
    description: "External counsel retainer — June 2026",
    amount: 125000,
    matterRef: "RETAINER-2026-06",
    approvedBy: "CEO",
    receiptAttached: true,
  },
  {
    id: 907,
    date: "2026-04-22",
    category: "misc",
    description: "Legal research database subscription",
    amount: 18000,
    matterRef: "OPS-LEGAL-TOOLS",
    approvedBy: "Legal Head",
    receiptAttached: true,
  },
  {
    id: 908,
    date: "2026-04-05",
    category: "court_fees",
    description: "Process server charges — Agrolink notice",
    amount: 3500,
    matterRef: "LN-OUT-2026-0042",
    approvedBy: "Legal Head",
    receiptAttached: true,
  },
];

export const legalExpensesYtd = mockLegalExpenses.reduce((sum, e) => sum + e.amount, 0);

export const expensesByCategory = mockLegalExpenses.reduce<Record<string, number>>((acc, e) => {
  acc[e.category] = (acc[e.category] ?? 0) + e.amount;
  return acc;
}, {});
