import { FinanceBankAccounts, getNextSequence } from "../../models/schema/index.js";
import { badRequest, parseIdParam } from "../../utils/route-errors.js";
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

export { getClientLedgers, getVendorLedgers, getExpenseCategoryLedgers, getBankLedgers, createBankAccount };
