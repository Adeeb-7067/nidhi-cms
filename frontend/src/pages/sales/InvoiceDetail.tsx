import { Link, useRoute } from "wouter";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  getInvoiceById,
  getPartialPaymentsByInstallment,
  getInstallmentById,
  mockFinancialTimeline,
} from "@/modules/sales/mock-data";
import {
  SalesPageHeader,
  SalesEmptyState,
  InvoicePreview,
  PaymentHistoryTable,
  FinancialActivityTimeline,
} from "@/modules/sales/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function InvoiceDetailPage() {
  const [, params] = useRoute("/sales/invoices/:id");
  const invoiceId = Number(params?.id);
  const invoice = getInvoiceById(invoiceId);
  const installment = invoice?.installmentId ? getInstallmentById(invoice.installmentId) : undefined;
  const payments = installment ? getPartialPaymentsByInstallment(installment.id) : [];
  const timeline = mockFinancialTimeline.filter(
    (e) => e.href?.includes(`/invoices/${invoiceId}`) || e.description.includes(invoice?.number ?? ""),
  );

  if (!invoice) {
    return (
      <SalesEmptyState
        title="Invoice not found"
        description={`No invoice #${invoiceId} in demo data.`}
        actionLabel="Back to invoices"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={invoice.number}
        description={invoice.customer}
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
            <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Download invoice PDF (demo)")}>
              <FileDown className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4 border-0 shadow-none bg-transparent p-0">
          <InvoicePreview invoice={invoice} />
          {payments.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Payments against this invoice</CardTitle></CardHeader>
              <CardContent><PaymentHistoryTable payments={payments} /></CardContent>
            </Card>
          )}
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Financial activity</CardTitle></CardHeader>
          <CardContent>
            {timeline.length > 0 ? (
              <FinancialActivityTimeline events={timeline} />
            ) : (
              <p className="text-xs text-muted-foreground">No linked timeline events.</p>
            )}
            {installment && (
              <Button variant="outline" size="sm" className="w-full mt-4 h-8" asChild>
                <Link href={`/sales/installments/${installment.id}`}>View installment</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalPageShell>
  );
}
