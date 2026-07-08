import { format } from "date-fns";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  IndianRupee,
  Pencil,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  FinancialTimelineEvent,
  Installment,
  PartialPayment,
  PaymentReceipt,
  SalesInvoice,
} from "../types";
import {
  calcProgress,
  calcRemaining,
  formatCurrency,
  FINANCIAL_EVENT_LABELS,
} from "../constants";
import { formatSalesDateTime, formatInstallmentSequence } from "../utils";
import { SalesStatusBadge } from "./SalesStatusBadge";
import { EditInstallmentNameDialog } from "./sales-action-dialogs";

export function OutstandingBadge({
  amount,
  className,
  showLabel = true,
}: {
  amount: number;
  className?: string;
  showLabel?: boolean;
}) {
  if (amount <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-700",
        className,
      )}
    >
      <AlertCircle className="h-3 w-3" />
      {showLabel && "Outstanding "}
      {formatCurrency(amount)}
    </span>
  );
}

export function InstallmentProgress({
  paid,
  total,
  className,
  showLabels = true,
}: {
  paid: number;
  total: number;
  className?: string;
  showLabels?: boolean;
}) {
  const pct = calcProgress(paid, total);
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatCurrency(paid)} paid</span>
          <span>
            {pct}% · {formatCurrency(calcRemaining(total, paid))} left
          </span>
        </div>
      )}
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export function FinancialSummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = "blue",
  alert,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "green" | "amber" | "red" | "violet";
  alert?: boolean;
}) {
  const accents = {
    blue: "text-blue-600 bg-blue-500/10",
    green: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    red: "text-red-600 bg-red-500/10",
    violet: "text-violet-600 bg-violet-500/10",
  };
  return (
    <Card className={cn(alert && "border-red-500/30")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
            {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", accents[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InstallmentCard({
  installment,
  href,
  compact,
  editable,
}: {
  installment: {
    id: number;
    name: string;
    dueAmount: number;
    paidAmount: number;
    dueDate: string;
    status: Installment["status"];
    projectId?: number;
    projectName?: string;
    customerId?: number;
    customerName?: string;
    sequenceNumber?: number;
    sequenceTotal?: number;
    invoiceId?: number | null;
    invoiceNumber?: string;
    createdAt?: string;
  };
  href?: string;
  compact?: boolean;
  editable?: boolean;
}) {
  const [, navigate] = useLocation();
  const [editOpen, setEditOpen] = useState(false);
  const remaining = calcRemaining(installment.dueAmount, installment.paidAmount);
  const projectLabel =
    installment.projectName ??
    (installment.projectId ? `Project #${installment.projectId}` : null);
  const invoiceLabel = installment.invoiceNumber ?? (installment.invoiceId ? `INV-${installment.invoiceId}` : null);
  const sequenceLabel = formatInstallmentSequence(
    installment.sequenceNumber,
    installment.sequenceTotal,
  );

  const handleCardClick = () => {
    if (href) navigate(href);
  };

  return (
    <Card
      className={cn("transition-colors hover:border-primary/30", href && "cursor-pointer")}
      onClick={href ? handleCardClick : undefined}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            {sequenceLabel && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">
                {sequenceLabel}
              </p>
            )}
            <div className="flex items-center gap-1 min-w-0">
              <p className="text-sm font-semibold truncate">{installment.name}</p>
              {editable && (
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                  aria-label="Edit installment name"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {installment.customerName && (
              <p className="text-[10px] text-muted-foreground truncate">{installment.customerName}</p>
            )}
            {projectLabel && (
              <p className="text-[10px] text-muted-foreground truncate">{projectLabel}</p>
            )}
          </div>
          <SalesStatusBadge variant="installment" value={installment.status} />
        </div>
        <InstallmentProgress paid={installment.paidAmount} total={installment.dueAmount} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {format(new Date(installment.dueDate), "MMM d, yyyy")}
            </span>
            {installment.createdAt && (
              <span>Created {formatSalesDateTime(installment.createdAt)}</span>
            )}
            {remaining > 0 && <OutstandingBadge amount={remaining} showLabel={false} />}
          </div>
          {!installment.invoiceId && installment.status !== "paid" && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Invoice pending
            </span>
          )}
          {invoiceLabel && installment.invoiceId && (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/sales/invoices/${installment.invoiceId}`);
              }}
            >
              <Receipt className="h-2.5 w-2.5" />
              {invoiceLabel}
            </button>
          )}
        </div>
      </CardContent>
      {editable && (
        <EditInstallmentNameDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          installmentId={installment.id}
          currentName={installment.name}
        />
      )}
    </Card>
  );
}

export function PaymentHistoryTable({
  payments,
  showReceiptLink = true,
  showInvoiceLink = false,
}: {
  payments: PartialPayment[];
  showReceiptLink?: boolean;
  showInvoiceLink?: boolean;
}) {
  if (payments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">No payments recorded yet.</p>
    );
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs">Created</TableHead>
            <TableHead className="text-xs">Amount</TableHead>
            <TableHead className="text-xs">Mode</TableHead>
            <TableHead className="text-xs">Transaction ID</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            {showInvoiceLink && <TableHead className="text-xs">Invoice</TableHead>}
            {showReceiptLink && <TableHead className="text-xs text-right">Receipt</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatSalesDateTime(p.paymentDate)}
              </TableCell>
              <TableCell className="text-xs font-medium tabular-nums">
                {formatCurrency(p.amount)}
              </TableCell>
              <TableCell className="text-xs">{p.mode}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {p.transactionId}
              </TableCell>
              <TableCell>
                <SalesStatusBadge variant="partialPayment" value={p.status} />
              </TableCell>
              {showInvoiceLink && (
                <TableCell className="text-xs font-mono">
                  {p.invoiceId ? (
                    <Link
                      href={`/sales/invoices/${p.invoiceId}`}
                      className="text-primary hover:underline"
                    >
                      {p.invoiceNumber ?? `INV-${p.invoiceId}`}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              {showReceiptLink && (
                <TableCell className="text-right">
                  {p.receiptId ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/sales/receipts/${p.receiptId}`}>{p.receiptNumber}</Link>
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PaymentTimeline({ payments }: { payments: PartialPayment[] }) {
  if (payments.length === 0) return null;
  return (
    <div className="relative space-y-0 pl-4 border-l-2 border-border ml-2">
      {payments.map((p) => (
        <div key={p.id} className="relative pb-4 last:pb-0">
          <div className="absolute -left-[calc(0.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          <div className="ml-3">
            <p className="text-xs font-medium">
              {formatCurrency(p.amount)} · {p.mode}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(p.paymentDate), "MMM d, yyyy h:mm a")} · {p.transactionId}
            </p>
            {p.receiptNumber && (
              <Link
                href={`/sales/receipts/${p.receiptId}`}
                className="text-[10px] text-primary hover:underline font-mono"
              >
                {p.receiptNumber}
              </Link>
            )}
            {p.invoiceId ? (
              <Link
                href={`/sales/invoices/${p.invoiceId}`}
                className="text-[10px] text-primary hover:underline font-mono ml-2"
              >
                {p.invoiceNumber ?? `INV-${p.invoiceId}`}
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinancialActivityTimeline({
  events,
  limit,
}: {
  events: FinancialTimelineEvent[];
  limit?: number;
}) {
  const rows = limit ? events.slice(0, limit) : events;
  return (
    <div className="space-y-0">
      {rows.map((event, i) => (
        <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {event.type.includes("payment") || event.type.includes("receipt") ? (
                <IndianRupee className="h-3.5 w-3.5" />
              ) : event.type.includes("invoice") ? (
                <Receipt className="h-3.5 w-3.5" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
            </div>
            {i < rows.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[1rem]" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold">{event.title}</p>
              <span className="text-[9px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                {FINANCIAL_EVENT_LABELS[event.type]}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{event.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">
                {formatSalesDateTime(event.createdAt)}
              </span>
              {event.amount != null && (
                <span className="text-[10px] font-medium text-emerald-700">
                  {formatCurrency(event.amount)}
                </span>
              )}
              {event.href && (
                <Link
                  href={event.href}
                  className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvoicePreview({ invoice }: { invoice: SalesInvoice }) {
  const remaining = calcRemaining(invoice.amount, invoice.paidAmount);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold">{invoice.number}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{invoice.customer}</p>
          </div>
          <SalesStatusBadge variant="invoice" value={invoice.status} />
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {invoice.projectName && (
          <div className="text-xs">
            <span className="text-muted-foreground">Project:</span>{" "}
            <span className="font-medium">{invoice.projectName}</span>
          </div>
        )}
        {invoice.installmentName && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">
              Linked installment
            </p>
            <p className="text-sm font-semibold mt-0.5">{invoice.installmentName}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Invoice amount</p>
            <p className="font-bold text-base tabular-nums">{formatCurrency(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-bold text-base tabular-nums text-emerald-700">
              {formatCurrency(invoice.paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className={cn("font-bold text-base tabular-nums", remaining > 0 && "text-amber-700")}>
              {formatCurrency(remaining)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Due date</p>
            <p className="font-medium">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
          </div>
        </div>
        <InstallmentProgress paid={invoice.paidAmount} total={invoice.amount} />
      </CardContent>
    </Card>
  );
}

export function ReceiptPreview({
  receipt,
  printMode,
}: {
  receipt: PaymentReceipt;
  printMode?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-lg rounded-xl border bg-white text-foreground shadow-sm",
        printMode && "shadow-none print:shadow-none print:border-black",
      )}
    >
      <div className="border-b p-6 text-center">
        <p className="text-lg font-bold tracking-tight">{receipt.companyName}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{receipt.companyAddress}</p>
        <p className="text-[10px] text-muted-foreground">GSTIN: {receipt.companyGstin}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">Payment Receipt</span>
        </div>
      </div>
      <div className="p-6 space-y-4 text-sm">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Receipt #</p>
            <p className="font-mono font-bold">{receipt.number}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted-foreground">Date</p>
            <p className="font-medium">{format(new Date(receipt.generatedAt), "MMM d, yyyy")}</p>
          </div>
        </div>
        <div className="rounded-lg border p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium">{receipt.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Project</span>
            <span className="font-medium text-right">{receipt.projectName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice ref</span>
            <span className="font-mono">{receipt.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Installment</span>
            <span>{receipt.installmentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment mode</span>
            <span>{receipt.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono text-[10px]">{receipt.transactionId}</span>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-[10px] uppercase text-emerald-700 font-medium">Amount received</p>
          <p className="text-2xl font-bold text-emerald-800 tabular-nums mt-1">
            {formatCurrency(receipt.amountPaid)}
          </p>
          <p className="text-xs text-emerald-700 mt-2">
            Remaining balance:{" "}
            <span className="font-semibold">{formatCurrency(receipt.remainingBalance)}</span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 pt-4 border-t mt-4">
          <p className="text-[10px] text-muted-foreground">Authorized seal</p>
          {receipt.sealUrl ? (
            <img
              src={receipt.sealUrl}
              alt="Official seal"
              className="h-16 w-16 object-contain"
              style={{ opacity: 0.92 }}
            />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground text-center">SEAL</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RevenueChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
