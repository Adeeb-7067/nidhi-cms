import { FinanceBankAccounts, FinancePayments, getNextSequence } from "../../models/schema/index.js";
import { badRequest, conflict, notFound, optionalString, parseIdParam } from "../../utils/route-errors.js";
import {
  computeClientLedgers,
  computeVendorLedgers,
  computeExpenseCategoryLedgers,
  computeBankLedgers,
} from "../../services/finance/finance-ledger.service.js";

async function getClientLedgers(req, res) {
  const clientId = req.params.id ? parseIdParam(req.params.id, "client id") : null;
  const accounts = await computeClientLedgers(clientId);
  res.json({ accounts });
}

async function getVendorLedgers(req, res) {
  const vendorId = req.params.id ? parseIdParam(req.params.id, "vendor id") : null;
  const accounts = await computeVendorLedgers(vendorId);
  res.json({ accounts });
}

async function getExpenseCategoryLedgers(req, res) {
  const accounts = await computeExpenseCategoryLedgers();
  res.json({ accounts });
}

async function getBankLedgers(req, res) {
  const bankAccountId = req.params.id ? parseIdParam(req.params.id, "bank account id") : null;
  const accounts = await computeBankLedgers(bankAccountId);
  res.json({ accounts });
}

async function createBankAccount(req, res) {
  const body = req.body ?? {};
  if (!body.name?.trim()) badRequest("name is required.", "name");
  const id = await getNextSequence("finance_bank_accounts");
  const account = await FinanceBankAccounts.create({
    id,
    name: body.name.trim(),
    bankName: body.bankName?.trim() || null,
    accountNumberMasked: body.accountNumberMasked?.trim() || null,
    ifsc: body.ifsc?.trim() || null,
    openingBalance: Math.round(Number(body.openingBalance) || 0),
    createdBy: req.user.id,
  });
  res.status(201).json(account.toObject());
}

async function updateBankAccount(req, res) {
  const id = parseIdParam(req.params.id, "bank account id");
  const account = await FinanceBankAccounts.findOne({ id }).lean();
  if (!account) notFound("Bank account");
  const body = req.body ?? {};
  const updates = {};
  if (body.name !== undefined) {
    const name = optionalString(body.name);
    if (!name) badRequest("name cannot be empty.", "name");
    updates.name = name;
  }
  if (body.bankName !== undefined) updates.bankName = optionalString(body.bankName) ?? null;
  if (body.accountNumberMasked !== undefined) updates.accountNumberMasked = optionalString(body.accountNumberMasked) ?? null;
  if (body.ifsc !== undefined) updates.ifsc = optionalString(body.ifsc) ?? null;
  if (body.openingBalance !== undefined) updates.openingBalance = Math.round(Number(body.openingBalance) || 0);

  const updated = await FinanceBankAccounts.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function deleteBankAccount(req, res) {
  const id = parseIdParam(req.params.id, "bank account id");
  const account = await FinanceBankAccounts.findOne({ id }).select({ id: 1 }).lean();
  if (!account) notFound("Bank account");
  const linkedPayment = await FinancePayments.findOne({ bankAccountId: id }).select({ id: 1 }).lean();
  if (linkedPayment) {
    conflict("This bank account has linked payments and cannot be deleted.", "bankAccountId");
  }
  await FinanceBankAccounts.deleteOne({ id });
  res.json({ success: true });
}

export {
  getClientLedgers,
  getVendorLedgers,
  getExpenseCategoryLedgers,
  getBankLedgers,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
};
