import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetInvoice,
  useGetCustomer,
  useListPayments,
  useGetInstallment,
  useUpdateInvoice,
} from "@/api/sales";
import { useGetSettings } from "@/api/generated/api";
import { toInvoicePreview, paymentToPartial } from "@/modules/sales/adapters";
import { resolveDocumentCompany } from "@/modules/sales/company-branding";
import { downloadElementAsPdf } from "@/modules/sales/pdf-download";
import {
  SalesPageHeader,
  SalesEmptyState,
  InvoiceDocument,
  PaymentHistoryTable,
  RecordPaymentDialog,
  TotalAmountAdjustFields,
  totalAdjustPayload,
} from "@/modules/sales/components";

export default function InvoiceDetailPage() {
  const [, params] = useRoute("/sales/invoices/:id");
  const invoiceId = Number(params?.id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const updateInvoice = useUpdateInvoice();
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);

  const { data: invoice, isLoading, isError } = useGetInvoice(invoiceId, !!invoiceId);
  const { data: customer } = useGetCustomer(invoice?.customerId ?? 0, !!invoice?.customerId);
  const { data: installment } = useGetInstallment(invoice?.installmentId ?? 0, !!invoice?.installmentId);
  const { data: paymentsData } = useListPayments(
    invoiceId ? { invoiceId } : undefined,
    !!invoiceId,
  );
  const { data: orgSettings } = useGetSettings();
  const company = resolveDocumentCompany(orgSettings);

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

  const handleDownloadPdf = async () => {
    const target = pdfRef.current ?? docRef.current;
    if (!target || !invoice) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(target, invoice.number, { singlePage: true });
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate invoice PDF");
    } finally {
      setDownloading(false);
    }
  };

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
    customer?.companyName,
    installment?.name,
  );
  const payments = (paymentsData?.payments ?? []).map(paymentToPartial);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={invoice.number}
        description={customer?.companyName ?? `Customer #${invoice.customerId}`}
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
            {invoice.status !== "paid" && (
              <Button size="sm" className="h-8" onClick={() => setPaymentOpen(true)}>
                Record payment
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4 border-0 shadow-none bg-transparent p-0">
          <div ref={docRef}>
            <InvoiceDocument
              invoice={preview}
              company={company}
              customerContact={customer?.contactPerson}
              customerEmail={customer?.email}
              customerPhone={customer?.phone ?? undefined}
              customerLocation={customer?.location ?? undefined}
              payments={payments}
            />
          </div>
          {payments.length > 0 && (
            <Card data-pdf-hide>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payments against this invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentHistoryTable payments={payments} />
              </CardContent>
            </Card>
          )}
        </Card>
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
            {invoice.status !== "paid" && (
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

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        defaultInvoiceId={invoiceId}
        onSuccess={(paymentId) => {
          window.location.href = `/sales/receipts/${paymentId}`;
        }}
      />

      <div
        ref={pdfRef}
        className="fixed left-[-10000px] top-0 w-[794px] pointer-events-none"
        aria-hidden
      >
        <InvoiceDocument
          invoice={preview}
          company={company}
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
