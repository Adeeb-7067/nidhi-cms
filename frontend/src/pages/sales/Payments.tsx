import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Plus, IndianRupee, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
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
import { formatProjectLabel, formatSalesDateTime } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
  RecordPaymentDialog,
} from "@/modules/sales/components";

const PAGE_SIZE = 20;

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
};

export default function Payments() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);

  useEffect(() => { setPage(1); }, [search]);

  const listParams = {
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch } = useListPayments(listParams);
  const { data: dashData } = useSalesDashboard();
  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const collected = dashData?.totalRevenue ?? payments.reduce((s, p) => s + p.amount, 0);

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
          { title: "Payments logged", value: total, icon: Receipt, accent: "blue", delay: 1 },
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
      ) : total === 0 ? (
        <SalesEmptyState icon={IndianRupee} title="No payments found" description="Record a payment against an invoice." actionLabel="Record payment" onAction={() => setRecordOpen(true)} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Receipt #</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Installment</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Invoice status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono text-primary">{p.receiptNumber}</TableCell>
                  <TableCell className="text-xs font-mono">
                    <Link
                      href={`/sales/invoices/${p.invoiceId}`}
                      className="hover:text-primary hover:underline underline-offset-2"
                    >
                      {p.invoiceNumber ?? `INV-${p.invoiceId}`}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={formatProjectLabel(p.projectId, p.projectName)}>
                    {formatProjectLabel(p.projectId, p.projectName)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                    {p.installmentName ?? (p.installmentId ? `Inst #${p.installmentId}` : "—")}
                  </TableCell>
                  <TableCell className="text-xs">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</TableCell>
                  <TableCell>
                    <SalesStatusBadge variant="invoice" value={p.invoiceStatus as "paid" | "partial" | "unpaid" | "overdue"} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatSalesDateTime(p.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/sales/invoices/${p.invoiceId}`}>Invoice</Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/sales/receipts/${p.id}`}>Receipt</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} payment{total === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
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
