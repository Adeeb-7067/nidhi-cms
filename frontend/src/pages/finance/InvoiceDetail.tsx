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
import { getFinanceInvoiceById } from "@/modules/finance/mock-data";
import { formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceInvoicePreview,
  FinanceStatusBadge,
} from "@/modules/finance/components";
import { toast } from "sonner";

export default function FinanceInvoiceDetailPage() {
  const [, params] = useRoute("/finance/invoices/:id");
  const invoiceId = Number(params?.id);
  const invoice = getFinanceInvoiceById(invoiceId);

  if (!invoice) {
    return (
      <PortalPageShell>
        <FinanceEmptyState
          title="Invoice not found"
          description={`No invoice #${invoiceId} in demo data.`}
          actionLabel="Back to invoices"
          onAction={() => window.history.back()}
        />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={invoice.number}
        description={invoice.clientName}
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
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Email sent to client (demo)")}>
              <Mail className="h-3.5 w-3.5" />Email
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Print dialog opened (demo)")}>
              <Printer className="h-3.5 w-3.5" />Print
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("PDF download started (demo)")}>
              <FileDown className="h-3.5 w-3.5" />Download PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <FinanceInvoicePreview invoice={invoice} />

          {invoice.paymentHistory.length > 0 && (
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
                    {invoice.paymentHistory.map((p) => (
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
              <Button variant="outline" size="sm" className="w-full h-8" onClick={() => toast.success("Payment recorded (demo)")}>
                Record payment
              </Button>
              <Button variant="outline" size="sm" className="w-full h-8" onClick={() => toast.success("Credit note created (demo)")}>
                Issue credit note
              </Button>
              <Button variant="outline" size="sm" className="w-full h-8" onClick={() => toast.success("Reminder sent (demo)")}>
                Send payment reminder
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalPageShell>
  );
}
