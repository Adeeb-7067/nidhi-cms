import type { CaVendor } from "../types";

export const mockCaVendors: CaVendor[] = [
  { id: 1, name: "AWS India Pvt Ltd", gstin: "29AAICA3918J1ZE", pan: "AAICA3918J", ledgerBalance: 245000, inputCreditAvailable: 44100, reconciliationStatus: "matched", lastPaymentAt: "2026-06-01" },
  { id: 2, name: "Google India Pvt Ltd", gstin: "27AAACG3771K1Z6", pan: "AAACG3771K", ledgerBalance: 89000, inputCreditAvailable: 16020, reconciliationStatus: "matched", lastPaymentAt: "2026-05-28" },
  { id: 3, name: "WeWork India Management", gstin: "27AABCU9603R1ZM", pan: "AABCU9603R", ledgerBalance: 180000, inputCreditAvailable: 32400, reconciliationStatus: "partial", lastPaymentAt: "2026-05-15" },
  { id: 4, name: "Tally Solutions Pvt Ltd", gstin: "29AABCT1332L1Z6", pan: "AABCT1332L", ledgerBalance: 54000, inputCreditAvailable: 9720, reconciliationStatus: "matched", lastPaymentAt: "2026-04-20" },
  { id: 5, name: "Deloitte Haskins & Sells", gstin: "09AAACD1234F1Z5", pan: "AAACD1234F", ledgerBalance: 450000, inputCreditAvailable: 81000, reconciliationStatus: "matched", lastPaymentAt: "2026-03-10" },
  { id: 6, name: "Freshworks Technologies", gstin: "33AAACF1234G1Z7", pan: "AAACF1234G", ledgerBalance: 72000, inputCreditAvailable: 12960, reconciliationStatus: "unmatched", lastPaymentAt: "2026-06-05" },
  { id: 7, name: "UrbanClap Technologies", gstin: "07AABCU1234H1Z8", pan: "AABCU1234H", ledgerBalance: 35000, inputCreditAvailable: 6300, reconciliationStatus: "matched", lastPaymentAt: "2026-02-14" },
  { id: 8, name: "Razorpay Software Pvt Ltd", gstin: "29AABCR1234I1Z9", pan: "AABCR1234I", ledgerBalance: 12500, inputCreditAvailable: 2250, reconciliationStatus: "matched", lastPaymentAt: "2026-06-08" },
];
