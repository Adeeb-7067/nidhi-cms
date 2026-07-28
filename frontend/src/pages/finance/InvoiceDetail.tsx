import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, FileDown, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { format } from "date-fns";
import { formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceInvoicePreview,
  FinanceStatusBadge,
  RecordPaymentModal,
  CreditNoteModal,
} from "@/modules/finance/components";
import { FinanceDetailPageSkeleton } from "@/components/loading";
import { useGetInvoice, useListPayments, useCancelInvoice, useRemindInvoice } from "@/api/finance";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function FinanceInvoiceDetailPage() {
  const [, params] = useRoute("/finance/invoices/:id");
  const invoiceId = Number(params?.id);
  const { data: invoice, isLoading, isError, refetch } = useGetInvoice(invoiceId);
  const { data: paymentsData } = useListPayments({ limit: 200 });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const cancelInvoice = useCancelInvoice();
  const remindInvoice = useRemindInvoice();

  if (isLoading) {
    return <FinanceDetailPageSkeleton />;
  }

  if (isError || !invoice) {
    return (
      <PortalPageShell>
        <FinanceEmptyState
          title="Invoice not found"
          description={`No invoice #${invoiceId}.`}
          actionLabel="Back to invoices"
          onAction={() => window.history.back()}
        />
      </PortalPageShell>
    );
  }

  const paymentHistory = (paymentsData?.payments ?? []).filter((p) => p.invoiceId === invoice.id);
  const remaining = Math.max(0, (invoice.total ?? 0) - invoice.paidAmount);

  const paymentColumns: CmsColumn<(typeof paymentHistory)[number]>[] = [
    {
      id: "date",
      header: "Date",
      cell: (p) => format(new Date(p.date), "MMM d, yyyy"),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (p) => <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>,
    },
    { id: "mode", header: "Mode", cell: (p) => PAYMENT_MODE_LABELS[p.mode] },
    {
      id: "reference",
      header: "Reference",
      cell: (p) => <span className="font-mono text-muted-foreground">{p.reference}</span>,
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (p) => <FinanceStatusBadge variant="payment" value={p.status} />,
    },
  ];

  const creditColumns: CmsColumn<(typeof invoice.creditNotes)[number]>[] = [
    { id: "id", header: "ID", cell: (cn) => <span className="font-mono">{cn.id}</span> },
    {
      id: "date",
      header: "Date",
      cell: (cn) => format(new Date(cn.date), "MMM d, yyyy"),
    },
    { id: "reason", header: "Reason", cell: (cn) => cn.reason },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (cn) => (
        <span className="tabular-nums text-red-700">−{formatCurrency(cn.amount)}</span>
      ),
    },
  ];

  const handleCancel = async () => {
    try {
      await cancelInvoice.mutateAsync({ id: invoice.id });
      toast.success("Invoice cancelled");
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to cancel invoice");
    }
  };

  const handleRemind = async () => {
    try {
      await remindInvoice.mutateAsync(invoice.id);
      toast.success("Reminder sent to client");
    } catch (err) {
      toastApiError(err, "Failed to send reminder");
    }
  };

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={invoice.number}
        description={invoice.clientName ?? undefined}
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Invoices", href: "/finance/invoices" },
          { label: invoice.number },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/finance/invoices"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Email sent to client")}>
              <Mail className="h-3.5 w-3.5" />Email
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />Print
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("PDF download started")}>
              <FileDown className="h-3.5 w-3.5" />Download PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <FinanceInvoicePreview invoice={invoice} />

          {paymentHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Payment history</CardTitle></CardHeader>
              <CardContent>
                <CmsDataTable
                  columns={paymentColumns}
                  rows={paymentHistory}
                  rowKey={(p) => p.id}
                  embedded
                />
              </CardContent>
            </Card>
          )}

          {invoice.creditNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Credit notes</CardTitle></CardHeader>
              <CardContent>
                <CmsDataTable
                  columns={creditColumns}
                  rows={invoice.creditNotes}
                  rowKey={(cn) => cn.id}
                  embedded
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes & actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {invoice.notes && <p className="text-xs text-muted-foreground">{invoice.notes}</p>}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8"
                disabled={remaining <= 0 || invoice.status === "cancelled"}
                onClick={() => setPaymentModalOpen(true)}
              >
                Record payment
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8"
                disabled={invoice.status === "cancelled"}
                onClick={() => setCreditNoteOpen(true)}
              >
                Issue credit note
              </Button>
              <Button variant="outline" size="sm" className="w-full h-8" onClick={handleRemind} disabled={remindInvoice.isPending}>
                Send payment reminder
              </Button>
              {invoice.paidAmount === 0 && invoice.status !== "cancelled" && (
                <Button variant="outline" size="sm" className="w-full h-8 text-destructive" onClick={handleCancel} disabled={cancelInvoice.isPending}>
                  Cancel invoice
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <RecordPaymentModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} invoice={invoice} onSuccess={() => refetch()} />
      <CreditNoteModal open={creditNoteOpen} onOpenChange={setCreditNoteOpen} invoiceId={invoice.id} onSuccess={() => refetch()} />
    </PortalPageShell>
  );
}
