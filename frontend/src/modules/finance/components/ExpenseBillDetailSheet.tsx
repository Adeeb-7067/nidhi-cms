import { format } from "date-fns";
import { Check, Loader2, Pencil, Wallet, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinanceStatusBadge } from "./FinanceStatusBadge";
import {
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_MODE_LABELS,
  formatCurrency,
} from "../constants";
import { useGetExpense, type Expense } from "@/api/finance";

type Props = {
  expenseId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  onApprove?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onPayRemaining?: (expense: Expense) => void;
};

function moneyLine(label: string, value: number, emphasize?: "due" | "paid" | "bill") {
  const tone =
    emphasize === "due"
      ? "text-amber-700 dark:text-amber-400"
      : emphasize === "paid"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${tone}`}>{formatCurrency(value)}</span>
    </div>
  );
}

export function ExpenseBillDetailSheet({
  expenseId,
  open,
  onOpenChange,
  canEdit = false,
  onApprove,
  onReject,
  onEdit,
  onPayRemaining,
}: Props) {
  const { data, isLoading, isError, refetch } = useGetExpense(expenseId ?? 0, open && !!expenseId);

  const bill = data?.amount ?? 0;
  const paid = data?.status === "approved" ? (data.recognizedAmount ?? data.paidAmount ?? 0) : 0;
  const due = data?.status === "approved" ? (data.remainingDue ?? Math.max(0, bill - paid)) : 0;
  const payments = data?.payments ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="px-6 pt-6 pb-4 border-b">
          <SheetHeader className="space-y-1 text-left pr-8">
            <SheetTitle className="font-mono text-base">
              {data?.reference ?? (isLoading ? "Loading…" : "Expense bill")}
            </SheetTitle>
            <SheetDescription>
              Full bill transparency — Bill is the obligation; Paid hits P&L; Due is still payable.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading bill…
            </div>
          ) : isError || !data ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load this bill.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <FinanceStatusBadge variant="expense" value={data.status} />
                {data.status === "approved" && data.paymentStatus ? (
                  <FinanceStatusBadge variant="expensePayment" value={data.paymentStatus} />
                ) : null}
                <FinanceStatusBadge variant="expenseCategory" value={data.category} />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                {moneyLine("Bill", bill, "bill")}
                {moneyLine("Paid (in P&L / budgets)", paid, "paid")}
                {moneyLine("Due", due, "due")}
                <p className="pt-1 text-[11px] text-muted-foreground leading-snug">
                  Dashboard and budgets use <span className="font-medium text-foreground">Paid</span> only —
                  unpaid Due is never treated as already spent.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted-foreground">Date</div>
                  <div>{format(new Date(data.date), "MMM d, yyyy")}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Mode (on bill)</div>
                  <div>{PAYMENT_MODE_LABELS[data.paymentMode]}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-muted-foreground">Vendor</div>
                  <div className="font-medium">{data.vendorName ?? "—"}</div>
                  {data.vendorSummary ? (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{data.vendorSummary}</div>
                  ) : null}
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Project</div>
                  <div>{data.projectName ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Category</div>
                  <div>{EXPENSE_CATEGORY_LABELS[data.category]}</div>
                </div>
                {data.loanName ? (
                  <div className="col-span-2">
                    <div className="text-[11px] text-muted-foreground">Loan</div>
                    <div>
                      {data.loanName}
                      {data.loanReference ? (
                        <span className="text-muted-foreground font-mono text-xs ml-1">{data.loanReference}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {data.subscriptionName ? (
                  <div className="col-span-2">
                    <div className="text-[11px] text-muted-foreground">Subscription</div>
                    <div>
                      {data.subscriptionName}
                      {data.subscriptionReference ? (
                        <span className="text-muted-foreground font-mono text-xs ml-1">
                          {data.subscriptionReference}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {data.chequeId ? (
                  <div className="col-span-2">
                    <div className="text-[11px] text-muted-foreground">Cheque</div>
                    <div>
                      <a
                        href={`/finance/cheques/${data.chequeId}`}
                        className="text-primary hover:underline"
                      >
                        {data.chequeNumber
                          ? `#${data.chequeNumber}`
                          : data.chequeReference ?? `Cheque #${data.chequeId}`}
                      </a>
                      {data.chequeStatus ? (
                        <span className="ml-2">
                          <FinanceStatusBadge variant="cheque" value={data.chequeStatus} />
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {data.notes ? (
                  <div className="col-span-2">
                    <div className="text-[11px] text-muted-foreground">Notes</div>
                    <div className="text-sm whitespace-pre-wrap">{data.notes}</div>
                  </div>
                ) : null}
              </div>

              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  {data.status === "pending" ? (
                    <>
                      <Button size="sm" className="gap-1.5" onClick={() => onApprove?.(data)}>
                        <Check className="h-3.5 w-3.5" />
                        Approve…
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onReject?.(data)}>
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onEdit?.(data)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </>
                  ) : null}
                  {data.status === "approved" && due > 0 && data.chequeStatus !== "issued" ? (
                    <Button size="sm" className="gap-1.5" onClick={() => onPayRemaining?.(data)}>
                      <Wallet className="h-3.5 w-3.5" />
                      Pay remaining ({formatCurrency(due)})
                    </Button>
                  ) : null}
                  {data.status === "approved" && due > 0 && data.chequeStatus === "issued" && data.chequeId ? (
                    <Button size="sm" variant="outline" className="gap-1.5" asChild>
                      <a href={`/finance/cheques/${data.chequeId}`}>
                        <Wallet className="h-3.5 w-3.5" />
                        Clear via Cheques
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Payment history</h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {payments.length} payment{payments.length === 1 ? "" : "s"}
                    {payments.length > 0 ? ` · ${formatCurrency(data.paymentsTotal ?? 0)}` : ""}
                  </span>
                </div>

                {payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-4">
                    {data.status === "approved"
                      ? due > 0
                        ? "No cash recorded yet — Due is still open."
                        : "No linked payment rows (legacy fully-paid bill)."
                      : "Payments appear here after approval when cash is recorded."}
                  </p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-[10px]">Date</TableHead>
                          <TableHead className="text-[10px]">Receipt</TableHead>
                          <TableHead className="text-[10px]">Mode</TableHead>
                          <TableHead className="text-[10px] text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs py-2">
                              <div>{format(new Date(p.date), "MMM d, yyyy")}</div>
                              {p.recordedByName ? (
                                <div className="text-[10px] text-muted-foreground">{p.recordedByName}</div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-[10px] font-mono py-2">
                              <div>{p.receiptNumber}</div>
                              {p.reference && p.reference !== p.receiptNumber ? (
                                <div className="text-muted-foreground truncate max-w-[120px]" title={p.reference}>
                                  {p.reference}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs py-2">{PAYMENT_MODE_LABELS[p.mode] ?? p.mode}</TableCell>
                            <TableCell className="text-xs text-right font-medium tabular-nums py-2">
                              {formatCurrency(p.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
