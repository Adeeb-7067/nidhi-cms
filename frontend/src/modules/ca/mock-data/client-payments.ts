import type { ClientPayment } from "../types";

export const mockClientPayments: ClientPayment[] = [
  { id: 1, clientName: "TechNova Solutions Pvt Ltd", invoiceRef: "INV-2026-0412", amount: 1180000, gstClassification: "gst", gstAmount: 180000, receivedAt: "2026-06-02", mode: "neft" },
  { id: 2, clientName: "GreenLeaf Retail LLP", invoiceRef: "INV-2026-0398", amount: 590000, gstClassification: "gst", gstAmount: 90000, receivedAt: "2026-06-05", mode: "rtgs" },
  { id: 3, clientName: "Export client — Dubai FZE", invoiceRef: "INV-2026-0405", amount: 850000, gstClassification: "non_gst", gstAmount: 0, receivedAt: "2026-06-08", mode: "neft" },
  { id: 4, clientName: "Bharat FinServ Ltd", invoiceRef: "INV-2026-0420", amount: 2360000, gstClassification: "gst", gstAmount: 360000, receivedAt: "2026-06-10", mode: "upi" },
  { id: 5, clientName: "EduSpark Academy", invoiceRef: "INV-2026-0385", amount: 354000, gstClassification: "gst", gstAmount: 54000, receivedAt: "2026-05-28", mode: "neft" },
  { id: 6, clientName: "HealthPlus Diagnostics", invoiceRef: "INV-2026-0371", amount: 472000, gstClassification: "gst", gstAmount: 72000, receivedAt: "2026-05-22", mode: "rtgs" },
  { id: 7, clientName: "Overseas client — Singapore Pte", invoiceRef: "INV-2026-0390", amount: 1200000, gstClassification: "non_gst", gstAmount: 0, receivedAt: "2026-05-15", mode: "neft" },
  { id: 8, clientName: "Metro Logistics Pvt Ltd", invoiceRef: "INV-2026-0360", amount: 826000, gstClassification: "gst", gstAmount: 126000, receivedAt: "2026-05-10", mode: "neft" },
  { id: 9, clientName: "StartupX Innovations", invoiceRef: "INV-2026-0355", amount: 295000, gstClassification: "gst", gstAmount: 45000, receivedAt: "2026-05-05", mode: "upi" },
  { id: 10, clientName: "AgriGrow Co-op Society", invoiceRef: "INV-2026-0348", amount: 177000, gstClassification: "non_gst", gstAmount: 0, receivedAt: "2026-04-28", mode: "cheque" },
];

export const clientPaymentSummary = {
  monthly: { gst: 4258000, nonGst: 2050000, total: 6308000 },
  quarterly: { gst: 11842000, nonGst: 4850000, total: 16692000 },
  yearly: { gst: 42875000, nonGst: 12400000, total: 55275000 },
};
