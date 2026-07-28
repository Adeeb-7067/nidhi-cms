import { runInTx } from "../../../lib/db-tx.js";
import {
  recordIncomingPayment,
  recordOutgoingPayment,
} from "../../finance/services/payment-ledger.service.js";
import {
  vendorsTable,
  clientsTable,
  FinancePayments,
} from "../../../models/schema/index.js";
import { CaSuspenseEntries } from "../schema/phase2.js";
import { badRequest, notFound, parseIdParam } from "../../../utils/route-errors.js";
import { dateOnly } from "./helpers.js";

/** Map CA payment modes onto Finance ledger modes. */
export function mapCaModeToFinance(mode) {
  switch (String(mode || "").toLowerCase()) {
    case "upi":
      return "upi";
    case "cheque":
      return "cheque";
    case "neft":
      return "neft";
    case "rtgs":
    case "imps":
    default:
      return "bank_transfer";
  }
}

/**
 * Assign suspense to client/vendor AND create the matching Finance payment
 * so money stays in Finance (source of truth) while CA closes the loop.
 */
export async function assignSuspenseEntry(req, res) {
  const id = parseIdParam(req.params.id);
  const body = req.body ?? {};
  const clientId = body.clientId != null ? Number(body.clientId) : null;
  const vendorId = body.vendorId != null ? Number(body.vendorId) : null;

  if ((!clientId && !vendorId) || (clientId && vendorId)) {
    badRequest("Provide exactly one of clientId or vendorId.", "clientId");
  }

  const entry = await CaSuspenseEntries.findOne({ id, isDeleted: false }).lean();
  if (!entry) notFound("Suspense entry");
  if (entry.resolvedAt && entry.financePaymentId) {
    badRequest("This suspense entry is already resolved.", "id");
  }

  const amount = Number(entry.amount ?? 0);
  if (!(amount > 0)) badRequest("Suspense amount must be positive.", "amount");

  const mode = mapCaModeToFinance(entry.mode);
  const date = entry.receivedAt ? new Date(entry.receivedAt) : new Date();
  const recordedBy = req.user.id;

  const result = await runInTx(async (session) => {
    let paymentId = entry.financePaymentId ?? null;

    if (clientId) {
      const client = await clientsTable.findOne({ id: clientId }).session(session).lean();
      if (!client) notFound("Client");
      const { payment } = await recordIncomingPayment(session, {
        clientId,
        amount,
        mode,
        date,
        recordedBy,
      });
      paymentId = payment.id;
      if (entry.bankRef) {
        await FinancePayments.updateOne(
          { id: paymentId },
          { $set: { reference: entry.bankRef } },
          { session },
        );
      }
    } else {
      const vendor = await vendorsTable.findOne({ id: vendorId }).session(session).lean();
      if (!vendor) notFound("Vendor");
      const { payment } = await recordOutgoingPayment(session, {
        partyName: vendor.name,
        vendorId,
        amount,
        mode,
        date,
        reference: entry.bankRef || `SUSPENSE-${entry.id}`,
        recordedBy,
      });
      paymentId = payment.id;
    }

    const updated = await CaSuspenseEntries.findOneAndUpdate(
      { id, isDeleted: false },
      {
        $set: {
          assignedClientId: clientId,
          assignedVendorId: vendorId,
          financePaymentId: paymentId,
          resolvedAt: new Date(),
        },
      },
      { new: true, session },
    ).lean();

    return updated;
  });

  res.json({
    id: result.id,
    receivedAt: dateOnly(result.receivedAt),
    amount: Number(result.amount ?? 0),
    bankRef: result.bankRef,
    mode: result.mode,
    remarks: result.remarks ?? "",
    financePaymentId: result.financePaymentId ?? null,
    assignedClientId: result.assignedClientId ?? null,
    assignedVendorId: result.assignedVendorId ?? null,
    resolvedAt: dateOnly(result.resolvedAt),
    paymentHref: result.financePaymentId
      ? `/finance/payments/finance/${result.financePaymentId}`
      : null,
  });
}
