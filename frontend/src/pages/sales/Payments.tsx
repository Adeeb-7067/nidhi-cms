import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, IndianRupee, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListPayments, useSalesDashboard } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
  RecordPaymentDialog,
} from "@/modules/sales/components";

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
};

export default function Payments() {
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useListPayments();
  const { data: dashData } = useSalesDashboard();
  const allPayments = data?.payments ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allPayments;
    return allPayments.filter(
      (p) =>
        p.receiptNumber.toLowerCase().includes(q) ||
        p.paymentMethod.toLowerCase().includes(q) ||
        (p.transactionId ?? "").toLowerCase().includes(q),
    );
  }, [allPayments, search]);

  const collected = allPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Payments"
        description="Record full and partial payments, generate receipts, and track collections."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Payments" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setRecordOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Record payment
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Collected", value: formatCurrency(collected), icon: IndianRupee, accent: "green", delay: 0 },
          { title: "Payments logged", value: allPayments.length, icon: Receipt, accent: "blue", delay: 1 },
          { title: "Outstanding", value: formatCurrency(dashData?.outstanding ?? 0), icon: IndianRupee, accent: "red", alert: true, delay: 2 },
          { title: "Pending invoices", value: dashData?.pendingInvoices ?? "—", icon: Receipt, accent: "amber", delay: 3 },
        ]}
      />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search receipt #, transaction ID, or mode…" />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState icon={IndianRupee} title="Failed to load payments" description="Could not fetch payment records." actionLabel="Retry" onAction={() => refetch()} />
      ) : filtered.length === 0 ? (
        <SalesEmptyState icon={IndianRupee} title="No payments found" description="Record a payment against an invoice." actionLabel="Record payment" onAction={() => setRecordOpen(true)} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Receipt #</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Invoice status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono text-primary">{p.receiptNumber}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {p.invoiceNumber ?? `INV #${p.invoiceId}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">Customer #{p.customerId}</TableCell>
                  <TableCell className="text-xs">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</TableCell>
                  <TableCell>
                    <SalesStatusBadge variant="invoice" value={p.invoiceStatus as "paid" | "partial" | "unpaid" | "overdue"} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(p.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/sales/receipts/${p.id}`}>Receipt</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onSuccess={(paymentId) => {
          window.location.href = `/sales/receipts/${paymentId}`;
        }}
      />
    </PortalPageShell>
  );
}
