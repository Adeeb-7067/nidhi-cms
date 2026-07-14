/**
 * Cash-basis expense recognition.
 *
 * - `amount` = vendor bill / obligation
 * - `paidAmount` + `paymentStatus` = what left the bank (what P&L / budgets count)
 * - Legacy approved rows with neither field set are treated as fully paid (pre-feature data)
 */

export const expensePaymentStatuses = ["unpaid", "partially_paid", "paid"];

/** True for pre-feature approved expenses with no settlement fields. */
export function isLegacyFullyPaidExpense(expense) {
  return (
    expense?.status === "approved" &&
    expense.paymentStatus == null &&
    (expense.paidAmount == null || expense.paidAmount === undefined)
  );
}

export function deriveExpensePaymentStatus(billAmount, paidAmount) {
  const bill = Number(billAmount) || 0;
  const paid = Math.max(0, Number(paidAmount) || 0);
  if (paid <= 0) return "unpaid";
  if (paid + 0.0001 >= bill) return "paid";
  return "partially_paid";
}

/** Amount that hits P&L / budgets / dashboard spend. */
export function recognizedExpenseAmount(expense) {
  if (!expense || expense.status !== "approved") return 0;
  if (isLegacyFullyPaidExpense(expense)) return Number(expense.amount) || 0;
  return Math.min(Number(expense.amount) || 0, Math.max(0, Number(expense.paidAmount) || 0));
}

/** Still owed on an approved bill. */
export function outstandingExpenseAmount(expense) {
  if (!expense || expense.status !== "approved") return 0;
  if (isLegacyFullyPaidExpense(expense)) return 0;
  return Math.max(0, (Number(expense.amount) || 0) - (Number(expense.paidAmount) || 0));
}

/** GST counted on a cash basis (prorated by paid / bill). */
export function recognizedExpenseGst(expense) {
  if (!expense?.gstEnabled || expense.status !== "approved") return 0;
  const bill = Number(expense.amount) || 0;
  const gst = Number(expense.gstAmount) || 0;
  if (!(bill > 0) || !(gst > 0)) return 0;
  if (isLegacyFullyPaidExpense(expense)) return gst;
  const paid = Math.max(0, Number(expense.paidAmount) || 0);
  return Math.round((gst * Math.min(paid, bill)) / bill);
}

/**
 * Mongo `$addFields` expression — sum this as cash spend for approved expenses.
 * Legacy (both settlement fields missing) → full amount; else → paidAmount.
 */
export function recognizedExpenseAmountExpr(fieldPrefix = "") {
  const p = fieldPrefix;
  return {
    $cond: [
      { $ne: [`$${p}status`, "approved"] },
      0,
      {
        $let: {
          vars: {
            isLegacy: {
              $and: [
                { $eq: [{ $ifNull: [`$${p}paymentStatus`, null] }, null] },
                { $eq: [{ $ifNull: [`$${p}paidAmount`, null] }, null] },
              ],
            },
          },
          in: {
            $cond: [
              "$$isLegacy",
              `$${p}amount`,
              { $min: [`$${p}amount`, { $ifNull: [`$${p}paidAmount`, 0] }] },
            ],
          },
        },
      },
    ],
  };
}

export function recognizedExpenseGstExpr(fieldPrefix = "") {
  const p = fieldPrefix;
  return {
    $cond: [
      {
        $or: [
          { $ne: [`$${p}status`, "approved"] },
          { $ne: [`$${p}gstEnabled`, true] },
        ],
      },
      0,
      {
        $let: {
          vars: {
            bill: { $ifNull: [`$${p}amount`, 0] },
            gst: { $ifNull: [`$${p}gstAmount`, 0] },
            isLegacy: {
              $and: [
                { $eq: [{ $ifNull: [`$${p}paymentStatus`, null] }, null] },
                { $eq: [{ $ifNull: [`$${p}paidAmount`, null] }, null] },
              ],
            },
            paid: { $ifNull: [`$${p}paidAmount`, 0] },
          },
          in: {
            $cond: [
              { $or: [{ $lte: ["$$bill", 0] }, { $lte: ["$$gst", 0] }] },
              0,
              {
                $cond: [
                  "$$isLegacy",
                  "$$gst",
                  {
                    $round: [
                      {
                        $multiply: [
                          "$$gst",
                          { $divide: [{ $min: ["$$paid", "$$bill"] }, "$$bill"] },
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ],
  };
}

export function withExpenseSettlementView(expense) {
  if (!expense) return expense;
  const recognizedAmount = recognizedExpenseAmount(expense);
  const remainingDue = outstandingExpenseAmount(expense);
  let paidAmount = 0;
  let paymentStatus = null;
  if (expense.status === "approved") {
    if (isLegacyFullyPaidExpense(expense)) {
      paidAmount = Number(expense.amount) || 0;
      paymentStatus = "paid";
    } else {
      paidAmount = Math.max(0, Number(expense.paidAmount) || 0);
      paymentStatus =
        expense.paymentStatus ?? deriveExpensePaymentStatus(expense.amount, paidAmount);
    }
  }
  return {
    ...expense,
    paidAmount,
    paymentStatus,
    remainingDue,
    recognizedAmount,
  };
}
