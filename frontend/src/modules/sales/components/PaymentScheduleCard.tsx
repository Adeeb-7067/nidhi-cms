import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, ChevronDown, ChevronUp, Loader2, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  useListInstallments,
  useCreateInstallment,
  useListPayments,
  useRecordPayment,
  type Installment,
  type InstallmentStatus,
  type PaymentMethod,
} from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { formatSalesDateTime, formatSalesPaymentDate, paymentDocumentInvoiceId } from "@/modules/sales/utils";
import { PaymentProofUploadField } from "./sales-action-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InstallmentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  paid:     { label: "Paid",     className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  partial:  { label: "Partial",  className: "bg-blue-100 text-blue-700 border-blue-200",          icon: <CreditCard className="h-3 w-3" /> },
  pending:  { label: "Pending",  className: "bg-slate-100 text-slate-600 border-slate-200",       icon: <Clock className="h-3 w-3" /> },
  overdue:  { label: "Overdue",  className: "bg-red-100 text-red-700 border-red-200",             icon: <AlertCircle className="h-3 w-3" /> },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi",           label: "UPI" },
  { value: "cheque",        label: "Cheque" },
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
];

// ── Add installment dialog ────────────────────────────────────────────────────

function AddInstallmentDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: number;
}) {
  const create = useCreateInstallment();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const reset = () => { setName(""); setAmount(""); setDueDate(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!dueDate) { toast.error("Due date is required"); return; }
    try {
      await create.mutateAsync({ invoiceId, name: name.trim(), dueAmount: Number(amount), dueDate });
      toast.success("Installment added");
      reset();
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to add installment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add installment</DialogTitle>
          <DialogDescription>Define a payment milestone for this invoice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
            <Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Advance, Milestone 1, Final" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} className="h-8 text-xs" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due date <span className="text-destructive">*</span></Label>
              <Input type="date" className="h-8 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add installment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Record partial payment dialog ─────────────────────────────────────────────

function RecordInstallmentPaymentDialog({
  open,
  onOpenChange,
  installment,
  invoiceId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  installment: Installment;
  invoiceId: number;
  onSuccess?: (paymentId: number) => void;
}) {
  const record = useRecordPayment();
  const remaining = Math.max(0, installment.dueAmount - installment.paidAmount);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(remaining > 0 ? String(Math.round(remaining)) : "");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setMethod("bank_transfer");
    setTxnId("");
    setNote("");
    setProofImageUrl("");
  }, [open, remaining]);

  const reset = () => {
    setAmount(remaining > 0 ? String(Math.round(remaining)) : "");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setTxnId("");
    setMethod("bank_transfer");
    setNote("");
    setProofImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > remaining) { toast.error(`Max payable is ${formatCurrency(remaining)}`); return; }
    try {
      const payment = await record.mutateAsync({
        invoiceId,
        installmentId: installment.id,
        amount: amt,
        paymentMethod: method,
        paymentDate,
        transactionId: txnId.trim() || undefined,
        note: note.trim() || undefined,
        proofImageUrl: proofImageUrl.trim() || undefined,
      });
      toast.success(`Payment of ${formatCurrency(amt)} recorded`);
      reset();
      onOpenChange(false);
      onSuccess?.(payment.id);
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {installment.name} · {formatCurrency(remaining)} remaining
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Payment date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                max={remaining}
                className="h-8 text-xs"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max ${formatCurrency(remaining)}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transaction / UTR ID (optional)</Label>
            <Input className="h-8 text-xs" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. UTR123456789" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea className="text-xs min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Internal note" />
          </div>
          <PaymentProofUploadField value={proofImageUrl} onChange={setProofImageUrl} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" type="submit" disabled={record.isPending}>
              {record.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Record payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Installment row ───────────────────────────────────────────────────────────

function InstallmentRow({
  installment,
  index,
  invoiceId,
  onPaySuccess,
}: {
  installment: Installment;
  index: number;
  invoiceId: number;
  onPaySuccess?: (paymentId: number) => void;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: paymentsData } = useListPayments(
    { installmentId: installment.id },
    historyOpen
  );
  const payments = paymentsData?.payments ?? [];

  const pct = installment.dueAmount > 0
    ? Math.min(100, Math.round((installment.paidAmount / installment.dueAmount) * 100))
    : 0;
  const remaining = Math.max(0, installment.dueAmount - installment.paidAmount);
  const isPaid = installment.status === "paid";
  const cfg = STATUS_CONFIG[installment.status] ?? STATUS_CONFIG.pending;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${installment.status === "overdue" ? "border-red-200 bg-red-50/30" : isPaid ? "border-emerald-200 bg-emerald-50/30" : "border-border bg-card"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{installment.name}</p>
            <p className="text-[11px] text-muted-foreground">Due {format(new Date(installment.dueDate), "MMM d, yyyy")}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] gap-1 shrink-0 ${cfg.className}`}>
          {cfg.icon}{cfg.label}
        </Badge>
      </div>

      {/* Amounts */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {formatCurrency(installment.paidAmount)} paid of {formatCurrency(installment.dueAmount)}
          </span>
          <span className="font-medium tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        {!isPaid && (
          <p className="text-[11px] text-muted-foreground">
            {formatCurrency(remaining)} remaining
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isPaid && (
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setPayOpen(true)}>
            <Plus className="h-3 w-3" />
            Record payment
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {installment.paidAmount > 0 ? "Payments" : "History"}
        </Button>
      </div>

      {/* Payment history (collapsible) */}
      {historyOpen && (
        <div className="border-t pt-3 space-y-1.5">
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No payments yet</p>
          ) : (
            payments.map((p) => {
              const docInvoiceId = paymentDocumentInvoiceId(p);
              return (
              <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href={`/sales/receipts/${p.id}`} className="font-mono text-[10px] text-primary hover:underline">
                    {p.receiptNumber}
                  </Link>
                  <Link
                    href={`/sales/invoices/${docInvoiceId}`}
                    className="font-mono text-[10px] text-primary hover:underline"
                  >
                    {p.invoiceNumber ?? `INV-${docInvoiceId}`}
                  </Link>
                  <span className="text-muted-foreground">{p.paymentMethod.replace("_", " ")}</span>
                  {p.transactionId && <span className="text-muted-foreground/70 text-[10px]">· {p.transactionId}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-semibold text-emerald-700">{formatCurrency(p.amount)}</span>
                  <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                    {formatSalesPaymentDate(p.paymentDate)}
                  </span>
                  <span className="text-muted-foreground/70 text-[10px] whitespace-nowrap">
                    {formatSalesDateTime(p.createdAt)}
                  </span>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      <RecordInstallmentPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        installment={installment}
        invoiceId={invoiceId}
        onSuccess={onPaySuccess}
      />
    </div>
  );
}

// ── PaymentScheduleCard ───────────────────────────────────────────────────────

export function PaymentScheduleCard({
  invoiceId,
  invoiceAmount,
  invoicePaidAmount,
  onPaySuccess,
}: {
  invoiceId: number;
  invoiceAmount: number;
  invoicePaidAmount: number;
  onPaySuccess?: (paymentId: number) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const { data, isLoading } = useListInstallments({ invoiceId }, !!invoiceId);
  const installments = data?.installments ?? [];

  const scheduledTotal = installments.reduce((sum, i) => sum + i.dueAmount, 0);
  const collectedTotal = installments.reduce((sum, i) => sum + i.paidAmount, 0);
  const remaining = Math.max(0, invoiceAmount - invoicePaidAmount);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Payment schedule</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3" /> Add installment
            </Button>
          </div>
          {installments.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Scheduled</p>
                <p className="text-xs font-semibold tabular-nums">{formatCurrency(scheduledTotal)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Collected</p>
                <p className="text-xs font-semibold tabular-nums text-emerald-700">{formatCurrency(collectedTotal)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Remaining</p>
                <p className="text-xs font-semibold tabular-nums text-orange-700">{formatCurrency(remaining)}</p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
            </div>
          ) : installments.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-muted-foreground">No installments yet.</p>
              <p className="text-[11px] text-muted-foreground/70">Add installments to split the invoice into a payment schedule and track partial payments against each one.</p>
            </div>
          ) : (
            installments.map((inst, i) => (
              <InstallmentRow
                key={inst.id}
                installment={inst}
                index={i}
                invoiceId={invoiceId}
                onPaySuccess={onPaySuccess}
              />
            ))
          )}
        </CardContent>
      </Card>

      <AddInstallmentDialog open={addOpen} onOpenChange={setAddOpen} invoiceId={invoiceId} />
    </>
  );
}
