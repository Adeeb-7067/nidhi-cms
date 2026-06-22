import type { DinDscRecord } from "../types";

export const mockDinDscRecords: DinDscRecord[] = [
  { id: 1, directorName: "Rajesh Sharma", din: "01234567", dscExpiry: "2026-08-15", dscStatus: "upcoming", daysToExpiry: 64 },
  { id: 2, directorName: "Priya Mehta", din: "08452196", dscExpiry: "2026-07-20", dscStatus: "upcoming", daysToExpiry: 38 },
  { id: 3, directorName: "Amit Verma", din: "09123456", dscExpiry: "2026-09-10", dscStatus: "upcoming", daysToExpiry: 90 },
  { id: 4, directorName: "Rajesh Sharma", din: "01234567", dscExpiry: "2025-03-01", dscStatus: "completed", daysToExpiry: -103 },
];

export const dinDscAlertThresholds = [90, 60, 30] as const;
