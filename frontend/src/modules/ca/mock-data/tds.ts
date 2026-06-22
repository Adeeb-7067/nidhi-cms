import type { TdsSummary, TdsReturn, TdsCertificate } from "../types";

export const tdsSummaryQ4: TdsSummary = {
  deducted: 485000,
  receivable: 42000,
  payable: 285000,
  quarter: "Q4 FY 2025–26",
};

export const mockTdsReturns: TdsReturn[] = [
  { id: 1, returnType: "24Q", quarter: "Q4 FY25–26", dueDate: "2026-05-31", status: "filed" },
  { id: 2, returnType: "26Q", quarter: "Q4 FY25–26", dueDate: "2026-07-31", status: "pending" },
  { id: 3, returnType: "27Q", quarter: "Q4 FY25–26", dueDate: "2026-07-31", status: "pending" },
  { id: 4, returnType: "24Q", quarter: "Q3 FY25–26", dueDate: "2026-01-31", status: "filed" },
  { id: 5, returnType: "26Q", quarter: "Q3 FY25–26", dueDate: "2026-01-31", status: "filed" },
];

export const mockTdsCertificates: TdsCertificate[] = [
  { id: 1, form: "16", party: "Employees (42)", pan: "Multiple", amount: 485000, issued: true },
  { id: 2, form: "16A", party: "WeWork India Management", pan: "AABCU9603R", amount: 48600, issued: true },
  { id: 3, form: "16A", party: "Deloitte Haskins & Sells", pan: "AAACD1234F", amount: 45000, issued: false },
  { id: 4, form: "16A", party: "AWS India Pvt Ltd", pan: "AAICA3918J", amount: 24500, issued: true },
];
