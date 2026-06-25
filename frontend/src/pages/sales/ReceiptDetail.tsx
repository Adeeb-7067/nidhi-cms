import { Link, useRoute } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { useGetReceipt } from "@/api/sales";
import { toReceiptPreview } from "@/modules/sales/adapters";
import { formatPaymentMethod } from "@/modules/sales/utils";
import { SalesPageHeader, SalesEmptyState, ReceiptPreview } from "@/modules/sales/components";

export default function ReceiptDetailPage() {
  const [, params] = useRoute("/sales/receipts/:id");
  const receiptId = Number(params?.id);

  const { data, isLoading, isError } = useGetReceipt(receiptId, !!receiptId);

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-96 w-full max-w-lg mx-auto rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !data?.payment || !data.invoice || !data.customer) {
    return (
      <SalesEmptyState
        title="Receipt not found"
        description={`No receipt #${receiptId} exists.`}
        actionLabel="Back to payments"
        onAction={() => window.history.back()}
      />
    );
  }

  const receipt = toReceiptPreview(data.payment, data.invoice, data.customer);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={receipt.number}
        description={`${receipt.customerName} · ${receipt.invoiceNumber}`}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Payments", href: "/sales/payments" },
          { label: receipt.number },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/sales/payments">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </>
        }
      />

      <p className="text-xs text-muted-foreground mb-4">
        Payment via {formatPaymentMethod(data.payment.paymentMethod)}
        {data.payment.transactionId ? ` · ${data.payment.transactionId}` : ""}
      </p>

      <div className="print:p-0">
        <ReceiptPreview receipt={receipt} printMode />
      </div>
    </PortalPageShell>
  );
}
