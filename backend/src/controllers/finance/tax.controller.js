import { FinanceTaxDeposits, getNextSequence } from "../../models/schema/index.js";
import { badRequest } from "../../utils/route-errors.js";
import { listTaxSummaries } from "../../services/finance/finance-tax.service.js";
import { taxDepositTypes } from "../../models/schema/finance/tax-deposits.js";

async function getTaxSummary(req, res) {
  const periodType = ["monthly", "quarterly", "annual"].includes(req.query.periodType)
    ? req.query.periodType
    : "monthly";
  const count = req.query.count ? Math.min(12, Number(req.query.count)) : 4;
  const summaries = await listTaxSummaries(periodType, count);
  res.json({ summaries });
}

async function createTaxDeposit(req, res) {
  const body = req.body ?? {};
  if (!taxDepositTypes.includes(body.type)) badRequest(`type must be one of: ${taxDepositTypes.join(", ")}.`, "type");
  if (!body.period?.trim()) badRequest("period is required.", "period");
  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");

  const id = await getNextSequence("finance_tax_deposits");
  const deposit = await FinanceTaxDeposits.create({
    id,
    type: body.type,
    period: body.period.trim(),
    amount,
    challanNumber: body.challanNumber?.trim() || null,
    depositedAt: body.depositedAt ? new Date(body.depositedAt) : new Date(),
    depositedBy: req.user.id,
  });
  res.status(201).json(deposit.toObject());
}

export { getTaxSummary, createTaxDeposit };
