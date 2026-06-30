import { useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { useGetReceipt } from "@/api/sales";
import { useGetSettings } from "@/api/generated/api";
import { toReceiptPreview } from "@/modules/sales/adapters";
import { resolveDocumentCompany } from "@/modules/sales/company-branding";
import { formatPaymentMethod } from "@/modules/sales/utils";
import { downloadElementAsPdf } from "@/modules/sales/pdf-download";
import { SalesPageHeader, SalesEmptyState, ReceiptDocument } from "@/modules/sales/components";

export default function ReceiptDetailPage() {
  const [, params] = useRoute("/sales/receipts/:id");
  const receiptId = Number(params?.id);
  const docRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useGetReceipt(receiptId, !!receiptId);
  const { data: orgSettings } = useGetSettings();
  const company = resolveDocumentCompany(orgSettings);

  const handleDownloadPdf = async () => {
    const target = pdfRef.current ?? docRef.current;
    if (!target || !data?.payment) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(target, data.payment.receiptNumber, { singlePage: true, widthPx: 794 });
      toast.success("Receipt PDF downloaded");
    } catch {
      toast.error("Failed to generate receipt PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-96 w-full max-w-lg mx-auto rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !data?.payment || !data.invoice) {
    return (
      <SalesEmptyState
        title="Receipt not found"
        description={`No receipt #${receiptId} exists.`}
        actionLabel="Back to payments"
        onAction={() => window.history.back()}
      />
    );
  }

  const receipt = toReceiptPreview(data.payment, data.invoice, data.customer ?? null, company, data.installment?.name);

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
          </>
        }
      />

      <p className="text-xs text-muted-foreground mb-4">
        Payment via {formatPaymentMethod(data.payment.paymentMethod)}
        {data.payment.transactionId ? ` · ${data.payment.transactionId}` : ""}
      </p>

      <div ref={docRef} className="flex justify-center">
        <ReceiptDocument receipt={receipt} />
      </div>

      <div
        ref={pdfRef}
        className="fixed left-[-10000px] top-0 w-[794px] pointer-events-none"
        aria-hidden
      >
        <ReceiptDocument receipt={receipt} compact />
      </div>
    </PortalPageShell>
  );
}
