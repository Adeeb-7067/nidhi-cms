import type { AuditRecord } from "../types";

export const mockAuditRecords: AuditRecord[] = [
  { id: 1, type: "statutory", auditor: "Deloitte Haskins & Sells LLP", financialYear: "2024–25", phase: "completed", observations: 2, status: "completed" },
  { id: 2, type: "internal", auditor: "Internal Audit Team", financialYear: "2024–25", phase: "completed", observations: 5, status: "completed" },
  { id: 3, type: "statutory", auditor: "Deloitte Haskins & Sells LLP", financialYear: "2025–26", phase: "fieldwork", observations: 0, status: "upcoming" },
  { id: 4, type: "internal", auditor: "Internal Audit Team", financialYear: "2025–26 Q1", phase: "review", observations: 3, status: "upcoming" },
];

export const statutoryAuditorDetails = {
  firm: "Deloitte Haskins & Sells LLP",
  partner: "CA Sanjay Gupta",
  membershipNo: "012345",
  appointmentDate: "2024-09-15",
  tenureEnd: "2029-09-14",
};
