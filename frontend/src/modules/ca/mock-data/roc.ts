import type { RocFiling } from "../types";

export const mockRocFilings: RocFiling[] = [
  { id: 1, form: "MGT-7", financialYear: "2024–25", dueDate: "2025-11-28", status: "overdue" },
  { id: 2, form: "AOC-4", financialYear: "2024–25", dueDate: "2025-10-29", status: "overdue" },
  { id: 3, form: "ADT-1", financialYear: "2024–25", dueDate: "2025-10-14", status: "filed", filedAt: "2025-10-10" },
  { id: 4, form: "DIR-3 KYC", financialYear: "2025–26", dueDate: "2026-09-30", status: "pending" },
  { id: 5, form: "MGT-7", financialYear: "2023–24", dueDate: "2024-11-28", status: "filed", filedAt: "2024-11-15" },
  { id: 6, form: "AOC-4", financialYear: "2023–24", dueDate: "2024-10-29", status: "filed", filedAt: "2024-10-22" },
];
