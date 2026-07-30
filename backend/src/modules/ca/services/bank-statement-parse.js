/**
 * Parse bank statement CSV into normalized rows.
 * Supports common Indian export headers:
 *  - Date, Narration, Chq/Ref No, Withdrawal Amt, Deposit Amt, Closing Balance
 *  - Date, Description, Reference, Amount, Type (CR/DR)
 *  - date,description,reference,amount,direction (incoming|outgoing)
 */

function stripBom(text) {
  return String(text || "").replace(/^\uFEFF/, "");
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseAmount(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw).replace(/[₹,\s]/g, "").replace(/\((.*)\)/, "-$1");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const iso = new Date(s);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function findCol(headers, predicates) {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (predicates.some((fn) => fn(h))) return i;
  }
  return -1;
}

/**
 * @param {string} csvText
 * @returns {{ rows: Array<{date:Date,description:string,reference:string,amount:number,direction:'incoming'|'outgoing',balance:number|null}>, errors: string[] }}
 */
export function parseBankStatementCsv(csvText) {
  const text = stripBom(csvText).trim();
  const errors = [];
  if (!text) return { rows: [], errors: ["CSV is empty"] };

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["CSV needs a header row and at least one data row"] };

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const dateIdx = findCol(headers, [(h) => h === "date" || h.includes("txn date") || h.includes("value date") || h.startsWith("tran date")]);
  const descIdx = findCol(headers, [
    (h) => h.includes("narration"),
    (h) => h.includes("description"),
    (h) => h.includes("particular"),
    (h) => h === "details",
  ]);
  const refIdx = findCol(headers, [
    (h) => h.includes("ref"),
    (h) => h.includes("chq"),
    (h) => h.includes("cheque"),
    (h) => h.includes("utr"),
    (h) => h.includes("transaction id"),
  ]);
  const withdrawalIdx = findCol(headers, [
    (h) => h.includes("withdrawal"),
    (h) => h.includes("debit") && !h.includes("credit"),
    (h) => h === "dr",
  ]);
  const depositIdx = findCol(headers, [
    (h) => h.includes("deposit"),
    (h) => h.includes("credit") && !h.includes("debit"),
    (h) => h === "cr",
  ]);
  const amountIdx = findCol(headers, [(h) => h === "amount" || h === "txn amount" || h === "transaction amount"]);
  const typeIdx = findCol(headers, [
    (h) => h === "type",
    (h) => h === "dr cr",
    (h) => h === "cr dr",
    (h) => h === "direction",
    (h) => h.includes("txn type"),
  ]);
  const balanceIdx = findCol(headers, [(h) => h.includes("balance")]);

  if (dateIdx < 0) errors.push("Could not find a Date column");
  if (withdrawalIdx < 0 && depositIdx < 0 && amountIdx < 0) {
    errors.push("Could not find Amount / Withdrawal / Deposit columns");
  }
  if (errors.length) return { rows: [], errors };

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;
    const date = parseDate(cols[dateIdx]);
    if (!date) {
      errors.push(`Row ${i + 1}: invalid date`);
      continue;
    }

    const description = descIdx >= 0 ? cols[descIdx] || "" : "";
    const reference = refIdx >= 0 ? cols[refIdx] || "" : "";
    let amount = null;
    let direction = null;

    const withdrawal = withdrawalIdx >= 0 ? parseAmount(cols[withdrawalIdx]) : null;
    const deposit = depositIdx >= 0 ? parseAmount(cols[depositIdx]) : null;

    if (withdrawal != null && withdrawal > 0) {
      amount = Math.abs(withdrawal);
      direction = "outgoing";
    } else if (deposit != null && deposit > 0) {
      amount = Math.abs(deposit);
      direction = "incoming";
    } else if (amountIdx >= 0) {
      const rawAmt = parseAmount(cols[amountIdx]);
      if (rawAmt == null || rawAmt === 0) {
        errors.push(`Row ${i + 1}: missing amount`);
        continue;
      }
      amount = Math.abs(rawAmt);
      const typeRaw = typeIdx >= 0 ? String(cols[typeIdx] || "").toLowerCase() : "";
      if (typeRaw.includes("cr") || typeRaw.includes("credit") || typeRaw.includes("incoming") || typeRaw === "in") {
        direction = "incoming";
      } else if (typeRaw.includes("dr") || typeRaw.includes("debit") || typeRaw.includes("outgoing") || typeRaw === "out") {
        direction = "outgoing";
      } else if (rawAmt < 0) {
        direction = "outgoing";
      } else {
        direction = "incoming";
      }
    }

    if (!(amount > 0) || !direction) {
      errors.push(`Row ${i + 1}: could not resolve amount/direction`);
      continue;
    }

    const balance = balanceIdx >= 0 ? parseAmount(cols[balanceIdx]) : null;
    rows.push({ date, description, reference, amount, direction, balance });
  }

  return { rows, errors };
}

/**
 * Score how well a statement line matches a Finance payment (higher = better).
 */
export function scorePaymentMatch(line, payment) {
  if (!line || !payment) return -1;
  if (Number(line.amount) !== Number(payment.amount)) return -1;
  const lineDir = line.direction === "outgoing" ? "outgoing" : "incoming";
  if (payment.direction !== lineDir) return -1;

  let score = 50; // amount + direction
  const lineRef = String(line.reference || "").trim().toLowerCase();
  const payRef = String(payment.reference || "").trim().toLowerCase();
  const payReceipt = String(payment.receiptNumber || "").trim().toLowerCase();
  if (lineRef && (lineRef === payRef || lineRef === payReceipt || payRef.includes(lineRef) || lineRef.includes(payRef))) {
    score += 40;
  }

  const lineDate = new Date(line.date).getTime();
  const payDate = new Date(payment.date || payment.createdAt).getTime();
  if (Number.isFinite(lineDate) && Number.isFinite(payDate)) {
    const dayDiff = Math.abs(lineDate - payDate) / (24 * 60 * 60 * 1000);
    if (dayDiff <= 0.5) score += 20;
    else if (dayDiff <= 3) score += 10;
    else if (dayDiff <= 7) score += 4;
    else if (dayDiff > 14) score -= 20;
  }

  return score;
}

export function pickBestPaymentMatch(line, payments, { minScore = 60, usedIds = new Set() } = {}) {
  let best = null;
  let bestScore = minScore - 1;
  for (const p of payments) {
    if (usedIds.has(p.id)) continue;
    const score = scorePaymentMatch(line, p);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best ? { payment: best, score: bestScore } : null;
}
