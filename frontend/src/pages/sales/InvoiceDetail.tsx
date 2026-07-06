import { useEffect, useRef, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Download, Loader2, Pencil, Ban, AlertTriangle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetInvoice,
  useGetCustomer,
  useListPayments,
  useGetInstallment,
  useUpdateInvoice,
  useCancelInvoice,
  useReassignInvoiceCustomer,
  useListCustomers,
} from "@/api/sales";
import { toInvoicePreview, paymentToPartial } from "@/modules/sales/adapters";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
import { useSalesDocumentBranding } from "@/modules/sales/hooks/use-sales-document-branding";
import { downloadElementAsPdf } from "@/modules/sales/pdf-download";
import { formatSalesDateTime, formatProjectLabel, resolveInvoiceTotal } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesEmptyState,
  InvoiceDocument,
  PaymentHistoryTable,
  RecordPaymentDialog,
  TotalAmountAdjustFields,
  totalAdjustPayload,
  InvoiceFormSheet,
  PaymentScheduleCard,
  InstallmentProgress,
  SalesStatusBadge,
} from "@/modules/sales/components";

export default function InvoiceDetailPage() {
  const [, params] = useRoute("/sales/invoices/:id");
  const [, navigate] = useLocation();
  const invoiceId = Number(params?.id);
  const validId = Number.isFinite(invoiceId) && invoiceId > 0;
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const updateInvoice = useUpdateInvoice();
  const cancelInvoice = useCancelInvoice();
  const reassignCustomer = useReassignInvoiceCustomer();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignCustomerId, setReassignCustomerId] = useState("");
  const { data: customersData } = useListCustomers({ limit: 200 }, reassignOpen);
  const customers = customersData?.customers ?? [];
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);

  const { data: invoice, isLoading, isError } = useGetInvoice(invoiceId, validId);
  const { data: customer } = useGetCustomer(invoice?.customerId ?? 0, !!invoice?.customerId);
  const { data: installment } = useGetInstallment(invoice?.installmentId ?? 0, !!invoice?.installmentId);
  const { data: paymentsData } = useListPayments(
    invoiceId ? { invoiceId } : undefined,
    !!invoiceId,
  );
  const branding = useSalesDocumentBranding();

  useEffect(() => {
    if (!invoice) return;
    setTotalAdjustment(invoice.totalAdjustment ?? 0);
    setAdjustedTotal(invoice.adjustedTotal ?? null);
    setUseCustomTotal(invoice.adjustedTotal != null);
  }, [invoice?.id, invoice?.totalAdjustment, invoice?.adjustedTotal]);

  const calculatedAmount = invoice?.calculatedAmount ?? invoice?.amount ?? 0;
  const finalAmount = invoice
    ? totalAdjustPayload(calculatedAmount, totalAdjustment, useCustomTotal, adjustedTotal).amount
    : 0;

  const handleSaveAmount = async () => {
    if (!invoice) return;
    const payload = totalAdjustPayload(
      calculatedAmount,
      totalAdjustment,
      useCustomTotal,
      adjustedTotal,
    );
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        amount: payload.amount,
        calculatedAmount: payload.calculatedAmount,
        totalAdjustment: payload.totalAdjustment ?? 0,
        adjustedTotal: payload.adjustedTotal,
      });
      toast.success("Invoice amount updated");
    } catch (err) {
      toastApiError(err, "Failed to update invoice amount");
    }
  };

  const handleReassignCustomer = async () => {
    if (!invoice || !reassignCustomerId) return;
    try {
      await reassignCustomer.mutateAsync({
        id: invoice.id,
        customerId: Number(reassignCustomerId),
      });
      toast.success("Customer reassigned — totals updated on both customers");
      setReassignOpen(false);
    } catch (err) {
      toastApiError(err, "Could not reassign customer");
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    try {
      await cancelInvoice.mutateAsync({
        id: invoice.id,
        reason: cancelReason.trim() || undefined,
      });
      toast.success("Invoice cancelled");
      setCancelOpen(false);
      setCancelReason("");
      if (invoice.installmentId) {
        navigate(`/sales/installments/${invoice.installmentId}`);
      }
    } catch (err) {
      toastApiError(err, "Failed to cancel invoice");
    }
  };

  const handleDownloadPdf = async () => {
    const target = pdfRef.current ?? docRef.current;
    if (!target || !invoice) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(target, invoice.number, { singlePage: true, widthPx: 794 });
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate invoice PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!validId) {
    return (
      <SalesEmptyState
        title="Invalid invoice"
        description="The invoice link is not valid."
        actionLabel="Back to invoices"
        onAction={() => navigate("/sales/invoices")}
      />
    );
  }

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !invoice) {
    return (
      <SalesEmptyState
        title="Invoice not found"
        description={`No invoice #${invoiceId} exists.`}
        actionLabel="Back to invoices"
        onAction={() => window.history.back()}
      />
    );
  }

  const preview = toInvoicePreview(
    invoice,
    customer?.companyName ?? invoice.customerName ?? undefined,
  );
  const invoiceTotals = resolveInvoiceTotal({
    lineItems: invoice.lineItems,
    amount: invoice.amount,
    calculatedAmount: invoice.calculatedAmount,
    totalAdjustment: invoice.totalAdjustment,
    adjustedTotal: invoice.adjustedTotal,
  });
  const payments = (paymentsData?.payments ?? []).map(paymentToPartial);
  const isMilestoneInvoice = !!invoice.installmentId;
  const isCancelled = invoice.status === "cancelled";
  const isActive = !isCancelled && invoice.status !== "paid";
  const canReassignCustomer = !isCancelled && invoice.status === "paid";
  const canCancel = isActive && invoice.paidAmount === 0;
  const remaining = calcRemaining(invoice.amount, invoice.paidAmount);
  const installmentRemaining = installment
    ? calcRemaining(installment.dueAmount, installment.paidAmount)
    : remaining;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={invoice.number}
        description={invoice.title?.trim() || customer?.companyName || `Customer #${invoice.customerId}`}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Invoices", href: "/sales/invoices" },
          { label: invoice.number },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/sales/invoices">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={downloading}
              onClick={handleDownloadPdf}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>
            {canReassignCustomer && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  setReassignCustomerId(String(invoice.customerId));
                  setReassignOpen(true);
                }}
              >
                <UserRound className="h-3.5 w-3.5" />
                Reassign customer
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive border-destructive/30"
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel invoice
              </Button>
            )}
            {isActive && (
              <Button size="sm" className="h-8" onClick={() => setPaymentOpen(true)}>
                Record payment
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 -mt-1">
        <SalesStatusBadge variant="invoice" value={invoice.status} />
        <span className="text-xs text-muted-foreground">
          Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
        </span>
        <span className="text-xs text-muted-foreground">
          Created {formatSalesDateTime(invoice.createdAt)}
        </span>
        {!isCancelled && (
          <span className="text-xs font-semibold tabular-nums">
            {formatCurrency(remaining)} outstanding
          </span>
        )}
      </div>

      {isCancelled && (
        <div className="rounded-xl px-4 py-3.5 flex gap-3 bg-muted/50 border border-border">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">This invoice was cancelled</p>
            {invoice.cancelledAt && (
              <p className="text-xs text-muted-foreground">
                Cancelled {formatSalesDateTime(invoice.cancelledAt)}
              </p>
            )}
            {invoice.cancelReason && (
              <p className="text-sm text-muted-foreground">{invoice.cancelReason}</p>
            )}
            {invoice.installmentId && (
              <p className="text-xs text-muted-foreground">
                The linked milestone is available again — you can generate a new invoice from the installment page.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column — invoice document + direct payment history */}
        <div className="lg:col-span-2 space-y-4">
          <div ref={docRef}>
            <InvoiceDocument
              invoice={preview}
              branding={branding}
              customerContact={customer?.contactPerson}
              customerEmail={customer?.email}
              customerPhone={customer?.phone ?? undefined}
              customerLocation={customer?.location ?? undefined}
              payments={payments}
            />
          </div>
          {/* Payments not linked to any installment */}
          {payments.length > 0 && (
            <Card data-pdf-hide>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payment history</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentHistoryTable payments={payments} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — schedule + adjust + links */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Invoice summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {(invoiceTotals.hasLineItems || invoiceTotals.tax > 0) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums font-medium">{formatCurrency(invoiceTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (GST)</span>
                    <span className="tabular-nums font-medium">{formatCurrency(invoiceTotals.tax)}</span>
                  </div>
                </>
              )}
              {invoiceTotals.adjustmentDelta !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjustment</span>
                  <span className="tabular-nums font-medium">
                    {invoiceTotals.adjustmentDelta > 0 ? "+ " : "− "}
                    {formatCurrency(Math.abs(invoiceTotals.adjustmentDelta))}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <p className="text-muted-foreground">Invoice total</p>
                <p className="font-bold tabular-nums">{formatCurrency(invoice.amount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Paid</p>
                <p className="font-bold tabular-nums text-emerald-700">{formatCurrency(invoice.paidAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Outstanding</p>
                <p className="font-bold tabular-nums text-amber-700">{formatCurrency(remaining)}</p>
              </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-2">
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium truncate">{customer?.companyName ?? `#${invoice.customerId}`}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Project</p>
                <p className="font-medium">{formatProjectLabel(invoice.projectId, invoice.projectName)}</p>
              </div>
              </div>
            </CardContent>
          </Card>

          {isMilestoneInvoice && !isCancelled ? (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Linked milestone</CardTitle>
                <SalesStatusBadge variant="installment" value={installment?.status ?? "pending"} />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold">{installment?.name ?? "Milestone"}</p>
                {installment ? (
                  <InstallmentProgress paid={installment.paidAmount} total={installment.dueAmount} />
                ) : (
                  <InstallmentProgress paid={invoice.paidAmount} total={invoice.amount} />
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Due date</p>
                    <p className="font-medium">
                      {installment
                        ? format(new Date(installment.dueDate), "MMM d, yyyy")
                        : format(new Date(invoice.dueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-bold text-amber-700">{formatCurrency(installmentRemaining)}</p>
                  </div>
                </div>
                {isActive && (
                  <Button size="sm" className="w-full h-8" onClick={() => setPaymentOpen(true)}>
                    Record payment
                  </Button>
                )}
                {installment && (
                  <Button variant="outline" size="sm" className="w-full h-8" asChild>
                    <Link href={`/sales/installments/${installment.id}`}>Open installment</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : !isCancelled ? (
            <PaymentScheduleCard
              invoiceId={invoiceId}
              invoiceAmount={invoice.amount}
              invoicePaidAmount={invoice.paidAmount}
              onPaySuccess={(paymentId) => {
                window.location.href = `/sales/receipts/${paymentId}`;
              }}
            />
          ) : null}

          {!isMilestoneInvoice && isActive && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Direct payment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Record a payment against the full invoice (not tied to any installment).
                </p>
                <Button size="sm" className="w-full h-8" onClick={() => setPaymentOpen(true)}>
                  Record payment
                </Button>
              </CardContent>
            </Card>
          )}

          {!isMilestoneInvoice && !isCancelled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Adjust amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TotalAmountAdjustFields
                calculatedTotal={calculatedAmount}
                totalAdjustment={totalAdjustment}
                onTotalAdjustmentChange={setTotalAdjustment}
                adjustedTotal={adjustedTotal}
                onAdjustedTotalChange={setAdjustedTotal}
                useCustomTotal={useCustomTotal}
                onUseCustomTotalChange={setUseCustomTotal}
                finalTotal={finalAmount}
                compact
              />
              {isActive && (
                <Button
                  size="sm"
                  className="w-full h-8"
                  onClick={handleSaveAmount}
                  disabled={updateInvoice.isPending || finalAmount === invoice.amount}
                >
                  {updateInvoice.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Save amount
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {canCancel && (
            <Card className="border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">Cancel invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Void this invoice with no payments. Milestone invoices will be unlinked so you can bill again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel invoice
                </Button>
              </CardContent>
            </Card>
          )}

          {isMilestoneInvoice && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Amount</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Milestone invoice — amount matches the linked installment.</p>
                <p className="font-bold text-foreground tabular-nums">{formatCurrency(invoice.amount)}</p>
              </CardContent>
            </Card>
          )}

          {/* Links — placeholder removed duplicate adjust block below */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full h-8" asChild>
                <Link href={`/sales/customers/${invoice.customerId}`}>View customer</Link>
              </Button>
              {installment && (
                <Button variant="outline" size="sm" className="w-full h-8" asChild>
                  <Link href={`/sales/installments/${installment.id}`}>View installment</Link>
                </Button>
              )}
              {invoice.proposalId && (
                <Button variant="outline" size="sm" className="w-full h-8" asChild>
                  <Link href={`/sales/proposals/${invoice.proposalId}`}>View proposal</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        defaultInvoiceId={invoiceId}
        defaultInstallmentId={invoice.installmentId ?? undefined}
        onSuccess={(paymentId) => {
          window.location.href = `/sales/receipts/${paymentId}`;
        }}
      />
      <InvoiceFormSheet open={editOpen} onOpenChange={setEditOpen} invoice={invoice} />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invoice {invoice.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This voids the invoice. It only works when no payments have been recorded.
              {invoice.installmentId && " The linked milestone will be available to invoice again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason" className="text-xs">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Wrong milestone amount, client requested revision"
              className="min-h-[72px] text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelInvoice.isPending}>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelInvoice.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
            >
              {cancelInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign customer</DialogTitle>
            <DialogDescription>
              Move this paid invoice (and its payment records) to the correct customer.
              Amounts and line items stay unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Customer</Label>
            <Select value={reassignCustomerId} onValueChange={setReassignCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invoice.projectId ? (
              <p className="text-[11px] text-muted-foreground">
                {formatProjectLabel(invoice.projectId, invoice.projectName)} must belong to the selected customer.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !reassignCustomerId ||
                Number(reassignCustomerId) === invoice.customerId ||
                reassignCustomer.isPending
              }
              onClick={() => void handleReassignCustomer()}
            >
              {reassignCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        ref={pdfRef}
        className="fixed left-[-10000px] top-0 w-[794px] pointer-events-none"
        aria-hidden
      >
        <InvoiceDocument
          invoice={preview}
          branding={branding}
          customerContact={customer?.contactPerson}
          customerEmail={customer?.email}
          customerPhone={customer?.phone ?? undefined}
          customerLocation={customer?.location ?? undefined}
          payments={payments}
          compact
        />
      </div>
    </PortalPageShell>
  );
}
