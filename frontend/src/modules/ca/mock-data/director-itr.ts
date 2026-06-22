import type { DirectorItr } from "../types";

export const mockDirectorItr: DirectorItr[] = [
  { id: 1, directorName: "Rajesh Sharma", pan: "ABCPR1234A", financialYear: "2024–25", filingStatus: "filed", dueDate: "2025-07-31", taxLiability: 485000 },
  { id: 2, directorName: "Priya Mehta", pan: "ABCPM5678B", financialYear: "2024–25", filingStatus: "filed", dueDate: "2025-07-31", taxLiability: 320000 },
  { id: 3, directorName: "Amit Verma", pan: "ABCVV9012C", financialYear: "2024–25", filingStatus: "pending", dueDate: "2025-07-31", taxLiability: 0 },
  { id: 4, directorName: "Rajesh Sharma", pan: "ABCPR1234A", financialYear: "2025–26", filingStatus: "draft", dueDate: "2026-07-31", taxLiability: 0 },
  { id: 5, directorName: "Priya Mehta", pan: "ABCPM5678B", financialYear: "2025–26", filingStatus: "draft", dueDate: "2026-07-31", taxLiability: 0 },
];
