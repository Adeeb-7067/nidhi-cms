import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, FileDown, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Mode</TableHead>
                      <TableHead className="text-xs">Reference</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-xs font-medium tabular-nums">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-xs">{PAYMENT_MODE_LABELS[p.mode]}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.reference}</TableCell>
                        <TableCell><FinanceStatusBadge variant="payment" value={p.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {invoice.creditNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Credit notes</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.creditNotes.map((cn) => (
                      <TableRow key={cn.id}>
                        <TableCell className="text-xs font-mono">{cn.id}</TableCell>
                        <TableCell className="text-xs">{format(new Date(cn.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-xs">{cn.reason}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-red-700">−{formatCurrency(cn.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
