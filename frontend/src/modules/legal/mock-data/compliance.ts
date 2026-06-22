import type { ComplianceItem } from "../types";
import { counsel } from "./counsel";

export const mockComplianceItems: ComplianceItem[] = [
  {
    id: 801,
    framework: "Companies Act 2013",
    requirement: "Annual ROC filing (AOC-4, MGT-7)",
    status: "compliant",
    risk: "low",
    lastReview: "2026-05-15",
    nextReview: "2026-11-15",
    owner: counsel(1),
  },
  {
    id: 802,
    framework: "GST Act",
    requirement: "Monthly GSTR-1 / GSTR-3B filing",
    status: "compliant",
    risk: "low",
    lastReview: "2026-06-05",
    nextReview: "2026-07-05",
    owner: counsel(2),
  },
  {
    id: 803,
    framework: "DPDP Act 2023",
    requirement: "Data protection impact assessment",
    status: "review_pending",
    risk: "medium",
    lastReview: "2026-03-01",
    nextReview: "2026-06-30",
    owner: counsel(1),
  },
  {
    id: 804,
    framework: "Labour Codes",
    requirement: "POSH committee annual report",
    status: "partial",
    risk: "medium",
    lastReview: "2026-04-20",
    nextReview: "2026-06-25",
    owner: counsel(2),
  },
  {
    id: 805,
    framework: "IT Act 2000",
    requirement: "Cyber incident response plan",
    status: "compliant",
    risk: "low",
    lastReview: "2026-02-10",
    nextReview: "2026-08-10",
    owner: counsel(1),
  },
  {
    id: 806,
    framework: "Contract Act",
    requirement: "Vendor contract audit (top 20 vendors)",
    status: "non_compliant",
    risk: "high",
    lastReview: "2026-01-15",
    nextReview: "2026-06-20",
    owner: counsel(1),
  },
  {
    id: 807,
    framework: "FEMA",
    requirement: "Foreign remittance documentation",
    status: "compliant",
    risk: "low",
    lastReview: "2026-05-01",
    nextReview: "2026-11-01",
    owner: counsel(2),
  },
];

export const complianceScore = Math.round(
  (mockComplianceItems.filter((c) => c.status === "compliant").length / mockComplianceItems.length) * 100,
);
