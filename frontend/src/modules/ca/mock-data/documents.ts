import type { CaDocument } from "../types";

export const mockCaDocuments: CaDocument[] = [
  { id: 1, title: "GST Registration Certificate", category: "gst_certificate", version: "v1.0", uploadedAt: "2024-01-15", uploadedBy: "CA Team" },
  { id: 2, title: "Company PAN Card", category: "pan", version: "v1.0", uploadedAt: "2023-06-01", uploadedBy: "Admin" },
  { id: 3, title: "Memorandum of Association", category: "moa", version: "v2.1", uploadedAt: "2025-02-10", uploadedBy: "Company Sec." },
  { id: 4, title: "Articles of Association", category: "aoa", version: "v2.0", uploadedAt: "2025-02-10", uploadedBy: "Company Sec." },
  { id: 5, title: "Statutory Audit Report FY 2024–25", category: "audit_report", version: "v1.0", uploadedAt: "2025-09-25", uploadedBy: "Auditor" },
  { id: 6, title: "Company ITR FY 2024–25", category: "itr", version: "v1.0", uploadedAt: "2025-10-28", uploadedBy: "CA Team" },
  { id: 7, title: "GST Registration Certificate (Amendment)", category: "gst_certificate", version: "v1.1", uploadedAt: "2025-06-20", uploadedBy: "CA Team" },
  { id: 8, title: "Internal Audit Report Q4 FY25", category: "audit_report", version: "v1.0", uploadedAt: "2026-04-05", uploadedBy: "Internal Audit" },
];
