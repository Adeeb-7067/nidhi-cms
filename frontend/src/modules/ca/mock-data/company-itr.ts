import type { CompanyItr } from "../types";

export const mockCompanyItr: CompanyItr = {
  financialYear: "2024–25",
  revenue: 38500000,
  expenses: 26800000,
  profitBeforeTax: 11700000,
  taxLiability: 2925000,
  filingStatus: "filed",
  dueDate: "2025-10-31",
  filedAt: "2025-10-28",
};

export const companyItrDocuments = [
  { id: 1, name: "Audited P&L FY 2024–25", uploaded: true },
  { id: 2, name: "Balance Sheet FY 2024–25", uploaded: true },
  { id: 3, name: "Tax audit report (3CD)", uploaded: true },
  { id: 4, name: "ITR-V acknowledgment", uploaded: true },
  { id: 5, name: "Computation of income", uploaded: false },
];
