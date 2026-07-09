import { backfillSalesPaymentsToFinance } from "../../services/finance/sales-payment-sync.service.js";

async function syncSalesPayments(req, res) {
  const limit = req.body?.limit ? Number(req.body.limit) : 500;
  const result = await backfillSalesPaymentsToFinance({ limit: Number.isFinite(limit) ? limit : 500 });
  res.json(result);
}

export { syncSalesPayments };
