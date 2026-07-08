import { useEffect, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, IndianRupee, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetInstallment,
  useListPayments,
  useGetInvoice,
  useGetCustomer,
  useUpdateInstallment,
  useCreateInvoiceFromInstallment,
} from "@/api/sales";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
import { formatSalesDateTime, formatInstallmentSequence } from "@/modules/sales/utils";
import { paymentToPartial } from "@/modules/sales/adapters";
import {
  SalesPageHeader,
  SalesStatusBadge,
  SalesEmptyState,
  InstallmentProgress,
  PaymentHistoryTable,
  PaymentTimeline,
  OutstandingBadge,
  ReceiveInstallmentPaymentDialog,
  TotalAmountAdjustFields,
  totalAdjustPayload,
} from "@/modules/sales/components";

export default function InstallmentDetailPage() {
  const [, params] = useRoute("/sales/installments/:id");
  const [, navigate] = useLocation();
  const installmentId = Number(params?.id);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const updateInstallment = useUpdateInstallment();
  const createInvoice = useCreateInvoiceFromInstallment();
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [name, setName] = useState("");

  const { data: installment, isLoading, isError } = useGetInstallment(installmentId, !!installmentId);
  const { data: customer } = useGetCustomer(installment?.customerId ?? 0, !!installment?.customerId);
  const { data: invoice } = useGetInvoice(installment?.invoiceId ?? 0, !!installment?.invoiceId);
  const { data: paymentsData } = useListPayments({ installmentId }, !!installmentId);

  useEffect(() => {
    if (!installment) return;
    setTotalAdjustment(installment.totalAdjustment ?? 0);
    setAdjustedTotal(installment.adjustedTotal ?? null);
    setUseCustomTotal(installment.adjustedTotal != null);
    setName(installment.name);
  }, [installment?.id, installment?.totalAdjustment, installment?.adjustedTotal, installment?.name]);

  const calculatedAmount = installment?.calculatedAmount ?? installment?.dueAmount ?? 0;
  const finalDueAmount = installment
    ? totalAdjustPayload(calculatedAmount, totalAdjustment, useCustomTotal, adjustedTotal).dueAmount
    : 0;

  const handleIssueInvoice = async () => {
    if (!installment) return;
    try {
      const inv = await createInvoice.mutateAsync({ installmentId: installment.id });
      toast.success(`Invoice ${inv.number} ready to send`);
      navigate(`/sales/invoices/${inv.id}`);
    } catch (err) {
      toastApiError(err, "Failed to create invoice");
    }
  };

  const handleSaveName = async () => {
    if (!installment) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Milestone name is required");
      return;
    }
    if (trimmed === installment.name) return;
    try {
      await updateInstallment.mutateAsync({ id: installment.id, name: trimmed });
      toast.success("Installment name updated");
    } catch (err) {
      toastApiError(err, "Failed to update installment name");
    }
  };

  const handleSaveAmount = async () => {
    if (!installment) return;
    const payload = totalAdjustPayload(
      calculatedAmount,
      totalAdjustment,
      useCustomTotal,
      adjustedTotal,
    );
    try {
      await updateInstallment.mutateAsync({
        id: installment.id,
        dueAmount: payload.dueAmount,
        calculatedAmount: payload.calculatedAmount,
        totalAdjustment: payload.totalAdjustment ?? 0,
        adjustedTotal: payload.adjustedTotal,
      });
      toast.success("Installment amount updated");
    } catch (err) {
      toastApiError(err, "Failed to update installment amount");
    }
  };

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !installment) {
    return (
      <SalesEmptyState
        title="Installment not found"
        description={`No installment #${installmentId} exists.`}
        actionLabel="Back to installments"
        onAction={() => window.history.back()}
      />
    );
  }

  const remaining = calcRemaining(installment.dueAmount, installment.paidAmount);
  const payments = (paymentsData?.payments ?? []).map(paymentToPartial);
  const sequenceLabel = formatInstallmentSequence(
    installment.sequenceNumber,
    installment.sequenceTotal,
  );
  const customerLabel = installment.customerName ?? customer?.companyName ?? `Customer #${installment.customerId}`;
  const canReceive = remaining > 0;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={installment.name}
        description={
          [
            sequenceLabel,
            customerLabel,
            installment.projectId ? `Project #${installment.projectId}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Installments", href: "/sales/installments" },
          { label: installment.name },
        ]}
        actions={
          <>
            {canReceive && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setReceiveOpen(true)}>
                <IndianRupee className="h-3.5 w-3.5" />
                Receive payment
              </Button>
            )}
            {!invoice && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={createInvoice.isPending}
                onClick={() => void handleIssueInvoice()}
              >
                {createInvoice.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Issue invoice only
              </Button>
            )}
            {invoice && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                <Link href={`/sales/invoices/${invoice.id}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  {invoice.number}
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/sales/installments">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 -mt-1">
        <SalesStatusBadge variant="installment" value={installment.status} />
        {sequenceLabel && (
          <span className="text-xs font-medium text-primary">{sequenceLabel}</span>
        )}
        <Link
          href={`/sales/customers/${installment.customerId}`}
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          {customerLabel}
        </Link>
        <OutstandingBadge amount={remaining} />
      </div>

      {!invoice && canReceive && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Receive payment</span> records the money and creates the invoice automatically.
          Use <span className="font-medium text-foreground">Issue invoice only</span> when you need to send a bill before any payment arrives.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Milestone progress</CardTitle>
              {canReceive && (
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setReceiveOpen(true)}>
                  <IndianRupee className="h-3.5 w-3.5" />
                  Receive payment
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <InstallmentProgress paid={installment.paidAmount} total={installment.dueAmount} />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div><p className="text-muted-foreground">Due amount</p><p className="font-bold">{formatCurrency(installment.dueAmount)}</p></div>
                <div><p className="text-muted-foreground">Paid</p><p className="font-bold text-emerald-700">{formatCurrency(installment.paidAmount)}</p></div>
                <div><p className="text-muted-foreground">Remaining</p><p className="font-bold text-amber-700">{formatCurrency(remaining)}</p></div>
                <div><p className="text-muted-foreground">Due date</p><p className="font-medium">{format(new Date(installment.dueDate), "MMM d, yyyy")}</p></div>
                <div><p className="text-muted-foreground">Created</p><p className="font-medium whitespace-nowrap">{formatSalesDateTime(installment.createdAt)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment history</CardTitle></CardHeader>
            <CardContent>
              <PaymentHistoryTable payments={payments} showInvoiceLink />
              {payments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No payments recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Milestone name</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="installment-name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="installment-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Milestone 1 — Design"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="w-full h-8"
                onClick={() => void handleSaveName()}
                disabled={
                  updateInstallment.isPending ||
                  !name.trim() ||
                  name.trim() === installment.name
                }
              >
                {updateInstallment.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save name
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Adjust amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!installment.invoiceId ? (
                <>
                  <TotalAmountAdjustFields
                    calculatedTotal={calculatedAmount}
                    totalAdjustment={totalAdjustment}
                    onTotalAdjustmentChange={setTotalAdjustment}
                    adjustedTotal={adjustedTotal}
                    onAdjustedTotalChange={setAdjustedTotal}
                    useCustomTotal={useCustomTotal}
                    onUseCustomTotalChange={setUseCustomTotal}
                    finalTotal={finalDueAmount}
                    compact
                  />
                  {installment.status !== "paid" && (
                    <Button
                      size="sm"
                      className="w-full h-8"
                      onClick={handleSaveAmount}
                      disabled={updateInstallment.isPending || finalDueAmount === installment.dueAmount}
                    >
                      {updateInstallment.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Save amount
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Amount is locked while an invoice is linked. Edit the invoice to change billing.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment timeline</CardTitle></CardHeader>
            <CardContent>
              <PaymentTimeline payments={payments} />
              {payments.length === 0 && (
                <p className="text-xs text-muted-foreground">Payments will appear here after you receive one.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ReceiveInstallmentPaymentDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        installment={installment}
      />
    </PortalPageShell>
  );
}
