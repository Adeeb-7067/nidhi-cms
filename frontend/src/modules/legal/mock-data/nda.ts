import type { NdaRecord } from "../types";
import { counsel } from "./counsel";

export const mockNdaRecords: NdaRecord[] = [
  {
    id: 401,
    partyName: "Paytm Payments Bank",
    partyType: "client",
    status: "active",
    signedAt: "2024-06-15",
    expiresAt: "2027-06-14",
    risk: "low",
    assignedTo: counsel(1),
  },
  {
    id: 402,
    partyName: "SecureLogix Systems",
    partyType: "vendor",
    status: "expiring_soon",
    signedAt: "2023-07-01",
    expiresAt: "2026-07-01",
    risk: "medium",
    assignedTo: counsel(2),
  },
  {
    id: 403,
    partyName: "Rajesh Kumar",
    partyType: "employee",
    status: "active",
    signedAt: "2025-01-10",
    expiresAt: "2028-01-09",
    risk: "low",
    assignedTo: counsel(2),
  },
  {
    id: 404,
    partyName: "Innovate Partners LLP",
    partyType: "partner",
    status: "expiring_soon",
    signedAt: "2023-06-20",
    expiresAt: "2026-06-20",
    risk: "high",
    assignedTo: counsel(1),
  },
  {
    id: 405,
    partyName: "DataSync Global",
    partyType: "vendor",
    status: "expired",
    signedAt: "2022-03-01",
    expiresAt: "2025-03-01",
    risk: "high",
    assignedTo: counsel(1),
  },
  {
    id: 406,
    partyName: "New Hire Batch — Q2 2026",
    partyType: "employee",
    status: "draft",
    signedAt: "2026-06-01",
    expiresAt: "2029-05-31",
    risk: "low",
    assignedTo: counsel(2),
  },
  {
    id: 407,
    partyName: "Bright Solutions",
    partyType: "client",
    status: "active",
    signedAt: "2025-11-01",
    expiresAt: "2028-10-31",
    risk: "low",
    assignedTo: counsel(2),
  },
];

export const ndaExpiryAlerts = mockNdaRecords.filter(
  (n) => n.status === "expiring_soon" || n.status === "expired",
);
