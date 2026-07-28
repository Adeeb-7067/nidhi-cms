import { FinanceTaxDeposits, getNextSequence } from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../../utils/route-errors.js";
import { listTaxSummaries } from "../services/finance-tax.service.js";
import { taxDepositTypes } from "../schema/tax-deposits.js";
import { runInTx } from "../../../lib/db-tx.js";
import {
  settleTaxDeposit,
  reverseTaxDepositCash,
} from "../services/cash-bridges.service.js";

async function listTaxDeposits(req, res) {
  const { type } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (type && taxDepositTypes.includes(type)) filter.type = type;
  const [items, total] = await Promise.all([
    FinanceTaxDeposits.find(filter).sort({ depositedAt: -1 }).skip(skip).limit(limit).lean(),
    FinanceTaxDeposits.countDocuments(filter),
  ]);
  res.json({ deposits: items, total, page, limit });
}

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

  let deposit;
  await runInTx(async (session) => {
    const id = await getNextSequence("finance_tax_deposits");
    const [created] = await FinanceTaxDeposits.create(
      [
        {
          id,
          type: body.type,
          period: body.period.trim(),
          amount,
          challanNumber: body.challanNumber?.trim() || null,
          depositedAt: body.depositedAt ? new Date(body.depositedAt) : new Date(),
          depositedBy: req.user.id,
        },
      ],
      { session },
    );
    deposit = created.toObject ? created.toObject() : created;
    await settleTaxDeposit(session, {
      deposit,
      recordedBy: req.user.id,
      mode: body.paymentMode || "neft",
    });
    deposit = await FinanceTaxDeposits.findOne({ id }).session(session).lean();
  });

  res.status(201).json(deposit);
}

async function updateTaxDeposit(req, res) {
  const id = parseIdParam(req.params.id, "tax deposit id");
  const deposit = await FinanceTaxDeposits.findOne({ id }).lean();
  if (!deposit) notFound("Tax deposit");
  if (deposit.paymentId) {
    badRequest("Tax deposits with a recorded payment cannot be edited. Delete and re-create.", "id");
  }
  const body = req.body ?? {};
  const updates = {};
  if (body.type !== undefined) {
    if (!taxDepositTypes.includes(body.type)) badRequest(`type must be one of: ${taxDepositTypes.join(", ")}.`, "type");
    updates.type = body.type;
  }
  if (body.period !== undefined) {
    const period = optionalString(body.period);
    if (!period) badRequest("period cannot be empty.", "period");
    updates.period = period;
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
    updates.amount = amount;
  }
  if (body.challanNumber !== undefined) updates.challanNumber = optionalString(body.challanNumber) ?? null;
  if (body.depositedAt !== undefined) {
    const d = new Date(body.depositedAt);
    if (Number.isNaN(d.getTime())) badRequest("depositedAt is invalid.", "depositedAt");
    updates.depositedAt = d;
  }

  const updated = await FinanceTaxDeposits.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function deleteTaxDeposit(req, res) {
  const id = parseIdParam(req.params.id, "tax deposit id");
  const deposit = await FinanceTaxDeposits.findOne({ id }).lean();
  if (!deposit) notFound("Tax deposit");

  await runInTx(async (session) => {
    await reverseTaxDepositCash(session, deposit);
    await FinanceTaxDeposits.deleteOne({ id }, { session });
  });

  res.json({ success: true });
}

export {
  listTaxDeposits,
  getTaxSummary,
  createTaxDeposit,
  updateTaxDeposit,
  deleteTaxDeposit,
};
