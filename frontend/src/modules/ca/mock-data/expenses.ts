import type { CaExpense } from "../types";

export const mockCaExpenses: CaExpense[] = [
  { id: 1, category: "salary", description: "June 2026 payroll — 42 employees", amount: 8420000, date: "2026-06-01", gstEligible: false },
  { id: 2, category: "rent", description: "Noida office — Q2 rent", amount: 540000, date: "2026-04-01", vendor: "WeWork India", gstEligible: true },
  { id: 3, category: "software", description: "GitHub Enterprise annual", amount: 285000, date: "2026-03-15", vendor: "GitHub Inc", gstEligible: true },
  { id: 4, category: "hosting", description: "AWS cloud — May 2026", amount: 245000, date: "2026-06-01", vendor: "AWS India", gstEligible: true },
  { id: 5, category: "marketing", description: "Google Ads — May campaign", amount: 89000, date: "2026-05-31", vendor: "Google India", gstEligible: true },
  { id: 6, category: "travel", description: "Client visit — Mumbai", amount: 42500, date: "2026-05-20", gstEligible: false },
  { id: 7, category: "utilities", description: "Electricity & internet — May", amount: 28000, date: "2026-05-25", gstEligible: true },
  { id: 8, category: "software", description: "Figma Team plan", amount: 72000, date: "2026-04-01", vendor: "Figma Inc", gstEligible: true },
  { id: 9, category: "hosting", description: "Azure — April 2026", amount: 98000, date: "2026-05-05", vendor: "Microsoft India", gstEligible: true },
  { id: 10, category: "misc", description: "Office supplies & stationery", amount: 12500, date: "2026-05-12", gstEligible: true },
  { id: 11, category: "salary", description: "May 2026 payroll", amount: 8380000, date: "2026-05-01", gstEligible: false },
  { id: 12, category: "rent", description: "Bangalore co-working — May", amount: 180000, date: "2026-05-01", vendor: "91springboard", gstEligible: true },
];

export const expenseSummaryByPeriod = {
  monthly: { rent: 720000, salary: 8420000, software: 357000, hosting: 343000, marketing: 89000, travel: 42500, utilities: 28000, misc: 12500, total: 10012000 },
  quarterly: { rent: 2160000, salary: 25180000, software: 890000, hosting: 980000, marketing: 245000, travel: 128000, utilities: 82000, misc: 38000, total: 29805000 },
  yearly: { rent: 8640000, salary: 98640000, software: 3420000, hosting: 4120000, marketing: 980000, travel: 485000, utilities: 336000, misc: 152000, total: 116474000 },
};
