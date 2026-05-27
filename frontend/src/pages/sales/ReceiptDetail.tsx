import { Link, useRoute } from "wouter";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { getReceiptById } from "@/modules/sales/mock-data";
import { SalesPageHeader, SalesEmptyState, ReceiptPreview } from "@/modules/sales/components";
import { toast } from "sonner";

export default function ReceiptDetailPage() {
  const [, params] = useRoute("/sales/receipts/:id");
  const receiptId = Number(params?.id);
  const receipt = getReceiptById(receiptId);

  if (!receipt) {
    return (
      <SalesEmptyState
        title="Receipt not found"
        description={`No receipt #${receiptId} in demo data.`}
        actionLabel="Back to payments"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={receipt.number}
        description={`${receipt.customerName} · ${formatReceiptSubtitle(receipt)}`}
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
            <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Download receipt PDF (demo)")}>
              <FileDown className="h-3.5 w-3.5" />
              Download
            </Button>
          </>
        }
      />

      <div className="print:p-0">
        <ReceiptPreview receipt={receipt} printMode />
      </div>
    </PortalPageShell>
  );
}

function formatReceiptSubtitle(receipt: { installmentName: string; invoiceNumber: string }) {
  return `${receipt.installmentName} · ${receipt.invoiceNumber}`;
}
