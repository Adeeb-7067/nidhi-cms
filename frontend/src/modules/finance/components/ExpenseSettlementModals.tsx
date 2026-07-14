import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useApproveExpense,
  usePayExpenseRemaining,
  type Expense,
  type FinancePaymentMode,
} from "@/api/finance";
import { formatCurrency, PAYMENT_MODE_LABELS } from "../constants";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess?: () => void;
};

type ApproveStep = "choose" | "custom";

/** Approve a pending bill — three clear intents, or enter a custom paid-now amount. */
export function ApproveExpenseModal({ open, onOpenChange, expense, onSuccess }: BaseProps) {
  const approve = useApproveExpense();
  const [step, setStep] = useState<ApproveStep>("choose");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<FinancePaymentMode>("bank_transfer");

  useEffect(() => {
    if (!open || !expense) return;
    setStep("choose");
    setPaidAmount(String(Math.round((expense.amount / 2) * 100) / 100));
    setPaymentMode(expense.paymentMode || "bank_transfer");
  }, [open, expense]);

  if (!expense) return null;

  const bill = expense.amount;

  const runApprove = async (paid: number) => {
    if (!Number.isFinite(paid) || paid < 0 || paid > bill) {
      toast.error("Paid now must be between 0 and the bill amount");
      return;
    }
    try {
      await approve.mutateAsync({
        id: expense.id,
        paidAmount: paid,
        paymentMode: paid > 0 ? paymentMode : undefined,
      });
      const remaining = Math.max(0, bill - paid);
      toast.success(
        paid >= bill
          ? `Approved and paid ${formatCurrency(paid)} in full`
          : paid > 0
            ? `Approved · paid ${formatCurrency(paid)} · due ${formatCurrency(remaining)}`
            : `Approved with ${formatCurrency(bill)} still due`,
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to approve expense");
    }
  };

  const customPaid = Number(paidAmount);
  const customRemaining = Number.isFinite(customPaid) ? Math.max(0, bill - customPaid) : bill;
  const customInvalid = !Number.isFinite(customPaid) || customPaid < 0 || customPaid > bill;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve expense</DialogTitle>
          <DialogDescription>
            {expense.reference}
            {expense.vendorName ? ` · ${expense.vendorName}` : ""} · Bill{" "}
            {formatCurrency(bill)}. Choose how much cash left the bank now — P&L only counts Paid.
          </DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <>
            <DialogBody className="space-y-3">
              <Button
                className="w-full h-auto py-3 flex-col items-start gap-0.5"
                disabled={approve.isPending}
                onClick={() => runApprove(bill)}
              >
                <span className="font-semibold">Approve & pay in full</span>
                <span className="text-xs font-normal opacity-90">
                  Record {formatCurrency(bill)} paid · Due ₹0
                </span>
              </Button>
              <Button
                variant="secondary"
                className="w-full h-auto py-3 flex-col items-start gap-0.5"
                disabled={approve.isPending}
                onClick={() => setStep("custom")}
              >
                <span className="font-semibold">Approve & pay now…</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Enter a partial amount (e.g. half now, rest later)
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-3 flex-col items-start gap-0.5"
                disabled={approve.isPending}
                onClick={() => runApprove(0)}
              >
                <span className="font-semibold">Approve only (pay later)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Accept the bill · Due stays {formatCurrency(bill)} · P&L +₹0
                </span>
              </Button>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={approve.isPending}>
                Cancel
              </Button>
              {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody className="space-y-4">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Bill</span>
                  <span className="font-medium tabular-nums">{formatCurrency(bill)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Due after this</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(customInvalid ? 0 : customRemaining)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approve-paid">Paid now (₹)</Label>
                <Input
                  id="approve-paid"
                  type="number"
                  min={0}
                  max={bill}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPaidAmount(String(Math.round((bill / 2) * 100) / 100))}
                  >
                    Half
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPaidAmount(String(bill))}
                  >
                    Full
                  </Button>
                </div>
              </div>
              {customPaid > 0 ? (
                <div className="space-y-2">
                  <Label>Payment mode</Label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as FinancePaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_MODE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </DialogBody>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("choose")} disabled={approve.isPending}>
                Back
              </Button>
              <Button
                onClick={() => runApprove(customPaid)}
                disabled={approve.isPending || customInvalid}
              >
                {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve with this payment"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Record another cash payment against an approved bill with remaining due. */
export function PayExpenseRemainingModal({ open, onOpenChange, expense, onSuccess }: BaseProps) {
  const pay = usePayExpenseRemaining();
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<FinancePaymentMode>("bank_transfer");

  useEffect(() => {
    if (!open || !expense) return;
    const due = expense.remainingDue ?? Math.max(0, expense.amount - (expense.paidAmount ?? 0));
    setAmount(String(due));
    setPaymentMode(expense.paymentMode || "bank_transfer");
  }, [open, expense]);

  if (!expense) return null;

  const due = expense.remainingDue ?? Math.max(0, expense.amount - (expense.paidAmount ?? 0));
  const payAmt = Number(amount);
  const invalid = !Number.isFinite(payAmt) || payAmt <= 0 || payAmt > due + 0.0001;

  const submit = async () => {
    if (invalid) {
      toast.error("Amount must be greater than 0 and not exceed remaining due");
      return;
    }
    try {
      await pay.mutateAsync({ id: expense.id, amount: payAmt, paymentMode });
      toast.success(`Recorded payment of ${formatCurrency(payAmt)}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay remaining</DialogTitle>
          <DialogDescription>
            {expense.reference} — Bill {formatCurrency(expense.amount)}, Paid{" "}
            {formatCurrency(expense.paidAmount ?? 0)}, Due {formatCurrency(due)}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-amt">Amount to pay</Label>
            <Input
              id="pay-amt"
              type="number"
              min={0.01}
              max={due}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAmount(String(due))}>
              Pay full remaining
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Payment mode</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as FinancePaymentMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pay.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pay.isPending || invalid}>
            {pay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
