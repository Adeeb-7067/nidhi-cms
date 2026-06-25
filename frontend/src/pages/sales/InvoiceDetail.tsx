import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetInvoice,
  useGetCustomer,
  useListPayments,
  useGetInstallment,
} from "@/api/sales";
import { toInvoicePreview, paymentToPartial } from "@/modules/sales/adapters";
import {
  SalesPageHeader,
  SalesEmptyState,
  InvoicePreview,
  PaymentHistoryTable,
  RecordPaymentDialog,
} from "@/modules/sales/components";

export default function InvoiceDetailPage() {
  const [, params] = useRoute("/sales/invoices/:id");
  const invoiceId = Number(params?.id);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: invoice, isLoading, isError } = useGetInvoice(invoiceId, !!invoiceId);
  const { data: customer } = useGetCustomer(invoice?.customerId ?? 0, !!invoice?.customerId);
  const { data: installment } = useGetInstallment(invoice?.installmentId ?? 0, !!invoice?.installmentId);
  const { data: paymentsData } = useListPayments(
    invoiceId ? { invoiceId } : undefined,
    !!invoiceId,
  );

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
          <InvoicePreview invoice={preview} />
          {payments.length > 0 && (
            <Card>
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
    </PortalPageShell>
  );
}
