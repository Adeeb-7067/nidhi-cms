import {
  CaBankStatements,
  CaBankStatementLines,
} from "../schema/bank-statements.js";
import { CaSuspenseEntries } from "../schema/phase2.js";
import { FinancePayments, getNextSequence } from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination } from "../../../utils/route-errors.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { dateOnly } from "../services/helpers.js";
import {
  parseBankStatementCsv,
  pickBestPaymentMatch,
} from "../services/bank-statement-parse.js";

function formatStatement(doc) {
  return {
    id: doc.id,
    accountName: doc.accountName,
    bankName: doc.bankName ?? null,
    fileName: doc.fileName ?? null,
    periodFrom: dateOnly(doc.periodFrom),
    periodTo: dateOnly(doc.periodTo),
    importedAt: doc.importedAt ? new Date(doc.importedAt).toISOString() : null,
    lineCount: Number(doc.lineCount ?? 0),
    matchedCount: Number(doc.matchedCount ?? 0),
    unmatchedCount: Math.max(0, Number(doc.lineCount ?? 0) - Number(doc.matchedCount ?? 0)),
    notes: doc.notes ?? null,
  };
}

function formatLine(doc) {
  return {
    id: doc.id,
    statementId: doc.statementId,
    date: dateOnly(doc.date),
    description: doc.description ?? "",
    reference: doc.reference ?? "",
    amount: Number(doc.amount ?? 0),
    direction: doc.direction,
    balance: doc.balance != null ? Number(doc.balance) : null,
    status: doc.status,
    financePaymentId: doc.financePaymentId ?? null,
    matchedAt: doc.matchedAt ? new Date(doc.matchedAt).toISOString() : null,
    suspenseId: doc.suspenseId ?? null,
  };
}

async function refreshStatementCounts(statementId, session = null) {
  const filter = { statementId, isDeleted: false };
  const q = session ? CaBankStatementLines.find(filter).session(session) : CaBankStatementLines.find(filter);
  const lines = await q.select({ status: 1 }).lean();
  const matchedCount = lines.filter((l) => l.status === "matched").length;
  const update = { lineCount: lines.length, matchedCount };
  if (session) {
    await CaBankStatements.updateOne({ id: statementId }, { $set: update }).session(session);
  } else {
    await CaBankStatements.updateOne({ id: statementId }, { $set: update });
  }
  return update;
}

async function listStatements(req, res) {
  const pagination = parsePagination(req.query);
  const { items, total, page, limit } = await paginateModel(
    CaBankStatements,
    { isDeleted: false },
    pagination,
    { sort: { importedAt: -1 } },
  );
  res.json({ statements: items.map(formatStatement), total, page, limit });
}

async function getStatement(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await CaBankStatements.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("Bank statement");
  res.json(formatStatement(doc));
}

async function listStatementLines(req, res) {
  const statementId = parseIdParam(req.params.id);
  const statement = await CaBankStatements.findOne({ id: statementId, isDeleted: false }).select({ id: 1 }).lean();
  if (!statement) notFound("Bank statement");

  const pagination = parsePagination(req.query);
  const query = { statementId, isDeleted: false };
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.direction === "incoming" || req.query.direction === "outgoing") {
    query.direction = req.query.direction;
  }

  const { items, total, page, limit } = await paginateModel(CaBankStatementLines, query, pagination, {
    sort: { date: -1, id: -1 },
  });
  res.json({ lines: items.map(formatLine), total, page, limit, statementId });
}

async function importStatement(req, res) {
  const body = req.body ?? {};
  const csvText = body.csvText != null ? String(body.csvText) : "";
  const accountName = String(body.accountName || "").trim() || "Primary account";
  const bankName = body.bankName ? String(body.bankName).trim() : null;
  const fileName = body.fileName ? String(body.fileName).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const autoMatch = body.autoMatch !== false;

  const { rows, errors } = parseBankStatementCsv(csvText);
  if (!rows.length) {
    badRequest(errors[0] || "No valid statement rows found.", "csvText");
  }

  const dates = rows.map((r) => r.date.getTime());
  const periodFrom = new Date(Math.min(...dates));
  const periodTo = new Date(Math.max(...dates));

  const statementId = await getNextSequence("ca_bank_statements");
  await CaBankStatements.create({
    id: statementId,
    accountName,
    bankName,
    fileName,
    periodFrom,
    periodTo,
    importedAt: new Date(),
    lineCount: rows.length,
    matchedCount: 0,
    notes,
    createdBy: req.user.id,
  });

  const lineDocs = [];
  for (const row of rows) {
    const id = await getNextSequence("ca_bank_statement_lines");
    lineDocs.push({
      id,
      statementId,
      date: row.date,
      description: row.description,
      reference: row.reference,
      amount: row.amount,
      direction: row.direction,
      balance: row.balance,
      status: "unmatched",
      createdBy: req.user.id,
    });
  }
  if (lineDocs.length) await CaBankStatementLines.insertMany(lineDocs);

  let autoMatched = 0;
  if (autoMatch) {
    autoMatched = await runAutoMatch(statementId, req.user.id);
  } else {
    await refreshStatementCounts(statementId);
  }

  const statement = await CaBankStatements.findOne({ id: statementId }).lean();
  res.status(201).json({
    statement: formatStatement(statement),
    imported: rows.length,
    autoMatched,
    parseWarnings: errors,
  });
}

async function loadCandidatePayments() {
  return FinancePayments.find({})
    .select({
      id: 1,
      date: 1,
      createdAt: 1,
      amount: 1,
      direction: 1,
      reference: 1,
      receiptNumber: 1,
      status: 1,
    })
    .lean();
}

async function runAutoMatch(statementId, userId) {
  const lines = await CaBankStatementLines.find({
    statementId,
    isDeleted: false,
    status: "unmatched",
  }).lean();
  if (!lines.length) {
    await refreshStatementCounts(statementId);
    return 0;
  }

  const payments = await loadCandidatePayments();
  const usedIds = new Set(
    (
      await CaBankStatementLines.find({
        isDeleted: false,
        status: "matched",
        financePaymentId: { $ne: null },
      })
        .select({ financePaymentId: 1 })
        .lean()
    ).map((l) => l.financePaymentId),
  );

  let matched = 0;
  for (const line of lines) {
    const hit = pickBestPaymentMatch(line, payments, { minScore: 60, usedIds });
    if (!hit) continue;
    usedIds.add(hit.payment.id);
    await CaBankStatementLines.updateOne(
      { id: line.id },
      {
        $set: {
          status: "matched",
          financePaymentId: hit.payment.id,
          matchedAt: new Date(),
          matchedBy: userId,
        },
      },
    );
    matched += 1;
  }
  await refreshStatementCounts(statementId);
  return matched;
}

async function autoMatchStatement(req, res) {
  const id = parseIdParam(req.params.id);
  const statement = await CaBankStatements.findOne({ id, isDeleted: false }).lean();
  if (!statement) notFound("Bank statement");
  const matched = await runAutoMatch(id, req.user.id);
  const updated = await CaBankStatements.findOne({ id }).lean();
  res.json({ matched, statement: formatStatement(updated) });
}

async function matchLine(req, res) {
  const lineId = parseIdParam(req.params.lineId);
  const paymentId = Number(req.body?.paymentId);
  if (!Number.isFinite(paymentId)) badRequest("paymentId is required.", "paymentId");

  const line = await CaBankStatementLines.findOne({ id: lineId, isDeleted: false }).lean();
  if (!line) notFound("Statement line");

  const payment = await FinancePayments.findOne({ id: paymentId }).lean();
  if (!payment) notFound("Payment");

  if (Number(payment.amount) !== Number(line.amount)) {
    badRequest("Payment amount does not match statement line amount.", "paymentId");
  }
  const expectedDir = line.direction === "outgoing" ? "outgoing" : "incoming";
  if (payment.direction !== expectedDir) {
    badRequest("Payment direction does not match statement line.", "paymentId");
  }

  const conflict = await CaBankStatementLines.findOne({
    isDeleted: false,
    status: "matched",
    financePaymentId: paymentId,
    id: { $ne: lineId },
  })
    .select({ id: 1 })
    .lean();
  if (conflict) badRequest("That payment is already matched to another statement line.", "paymentId");

  const updated = await CaBankStatementLines.findOneAndUpdate(
    { id: lineId },
    {
      $set: {
        status: "matched",
        financePaymentId: paymentId,
        matchedAt: new Date(),
        matchedBy: req.user.id,
      },
    },
    { new: true },
  ).lean();

  await refreshStatementCounts(line.statementId);
  res.json(formatLine(updated));
}

async function unmatchLine(req, res) {
  const lineId = parseIdParam(req.params.lineId);
  const line = await CaBankStatementLines.findOne({ id: lineId, isDeleted: false }).lean();
  if (!line) notFound("Statement line");

  const updated = await CaBankStatementLines.findOneAndUpdate(
    { id: lineId },
    {
      $set: {
        status: "unmatched",
        financePaymentId: null,
        matchedAt: null,
        matchedBy: null,
      },
    },
    { new: true },
  ).lean();
  await refreshStatementCounts(line.statementId);
  res.json(formatLine(updated));
}

async function ignoreLine(req, res) {
  const lineId = parseIdParam(req.params.lineId);
  const line = await CaBankStatementLines.findOne({ id: lineId, isDeleted: false }).lean();
  if (!line) notFound("Statement line");
  const updated = await CaBankStatementLines.findOneAndUpdate(
    { id: lineId },
    {
      $set: {
        status: "ignored",
        financePaymentId: null,
        matchedAt: null,
        matchedBy: null,
      },
    },
    { new: true },
  ).lean();
  await refreshStatementCounts(line.statementId);
  res.json(formatLine(updated));
}

function mapModeForSuspense(descriptionOrMode = "") {
  const d = String(descriptionOrMode || "").toLowerCase();
  if (d.includes("upi") || d === "upi") return "upi";
  if (d.includes("neft") || d === "neft") return "neft";
  if (d.includes("rtgs") || d === "rtgs") return "rtgs";
  if (d.includes("imps") || d === "imps") return "imps";
  if (d.includes("chq") || d.includes("cheque") || d === "cheque") return "cheque";
  return "neft";
}

/**
 * Push unmatched incoming statement credits into CA Suspense (deduped by bankRef).
 */
async function unmatchedCreditsToSuspense(req, res) {
  const statementId = req.params.id ? parseIdParam(req.params.id) : null;
  const filter = {
    isDeleted: false,
    status: "unmatched",
    direction: "incoming",
    suspenseId: null,
  };
  if (statementId) {
    const st = await CaBankStatements.findOne({ id: statementId, isDeleted: false }).select({ id: 1 }).lean();
    if (!st) notFound("Bank statement");
    filter.statementId = statementId;
  }

  const lines = await CaBankStatementLines.find(filter).sort({ date: 1 }).lean();
  let created = 0;
  const results = [];

  for (const line of lines) {
    const bankRef = (line.reference || `STMT-${line.id}`).trim();
    const existing = await CaSuspenseEntries.findOne({
      isDeleted: false,
      bankRef,
      resolvedAt: null,
    })
      .select({ id: 1 })
      .lean();
    if (existing) {
      await CaBankStatementLines.updateOne({ id: line.id }, { $set: { suspenseId: existing.id } });
      results.push({ lineId: line.id, suspenseId: existing.id, created: false });
      continue;
    }

    const id = await getNextSequence("ca_suspense");
    await CaSuspenseEntries.create({
      id,
      receivedAt: line.date,
      amount: line.amount,
      bankRef,
      mode: mapModeForSuspense(line.description),
      remarks: line.description || `Imported from bank statement #${line.statementId}`,
      createdBy: req.user.id,
    });
    await CaBankStatementLines.updateOne({ id: line.id }, { $set: { suspenseId: id } });
    created += 1;
    results.push({ lineId: line.id, suspenseId: id, created: true });
  }

  res.json({ created, linked: results.length - created, total: results.length, results });
}

/**
 * Create suspense from Finance payments that look like unmatched cash
 * (incoming, completed, no invoice/expense/tax links, partyType other).
 */
async function unmatchedPaymentsToSuspense(req, res) {
  const payments = await FinancePayments.find({
    direction: "incoming",
    status: "completed",
    partyType: "other",
    invoiceId: null,
    salesInvoiceId: null,
    expenseId: null,
    vendorInvoiceId: null,
    taxDepositId: null,
    payrollRunId: null,
  })
    .sort({ date: -1 })
    .limit(200)
    .lean();

  let created = 0;
  const results = [];
  for (const p of payments) {
    const existingByPayment = await CaSuspenseEntries.findOne({
      isDeleted: false,
      financePaymentId: p.id,
    })
      .select({ id: 1 })
      .lean();
    if (existingByPayment) {
      results.push({ paymentId: p.id, suspenseId: existingByPayment.id, created: false });
      continue;
    }
    const bankRef = (p.reference || p.receiptNumber || `PMT-${p.id}`).trim();
    const openSameRef = await CaSuspenseEntries.findOne({
      isDeleted: false,
      bankRef,
      resolvedAt: null,
    })
      .select({ id: 1 })
      .lean();
    if (openSameRef) {
      await CaSuspenseEntries.updateOne(
        { id: openSameRef.id },
        { $set: { financePaymentId: p.id } },
      );
      results.push({ paymentId: p.id, suspenseId: openSameRef.id, created: false });
      continue;
    }

    const id = await getNextSequence("ca_suspense");
    await CaSuspenseEntries.create({
      id,
      receivedAt: p.date || p.createdAt || new Date(),
      amount: p.amount,
      bankRef,
      mode: mapModeForSuspense(p.mode),
      remarks: `Auto from unmatched payment ${p.receiptNumber || p.reference || p.id}`,
      financePaymentId: p.id,
      createdBy: req.user.id,
    });
    created += 1;
    results.push({ paymentId: p.id, suspenseId: id, created: true });
  }

  res.json({ created, linked: results.length - created, total: results.length, results });
}

async function deleteStatement(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await CaBankStatements.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("Bank statement");
  const now = new Date();
  await CaBankStatements.updateOne({ id }, { $set: { isDeleted: true, deletedAt: now } });
  await CaBankStatementLines.updateMany(
    { statementId: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: now } },
  );
  res.json({ ok: true });
}

export {
  listStatements,
  getStatement,
  listStatementLines,
  importStatement,
  autoMatchStatement,
  matchLine,
  unmatchLine,
  ignoreLine,
  unmatchedCreditsToSuspense,
  unmatchedPaymentsToSuspense,
  deleteStatement,
  formatStatement,
  formatLine,
  parseBankStatementCsv,
};
