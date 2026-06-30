import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListInvoices, useSalesDashboard } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { readSearchParam } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
  CreateInvoiceDialog,
  InvoiceFromProposalDialog,
} from "@/modules/sales/components";

const PAGE_SIZE = 20;

type InvoiceStatus = "paid" | "unpaid" | "partial" | "overdue";

const STATUS_TABS: (InvoiceStatus | "all")[] = ["all", "unpaid", "partial", "paid", "overdue"];

export default function Invoices() {
  const initialStatus = readSearchParam("status");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>(
    initialStatus && STATUS_TABS.includes(initialStatus as InvoiceStatus | "all") ? initialStatus : "all",
  );
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [fromProposalOpen, setFromProposalOpen] = useState(false);

  useEffect(() => { setPage(1); }, [search, statusTab]);

  const listParams = {
    search: search || undefined,
    status: statusTab === "all" ? undefined : (statusTab as InvoiceStatus),
    page,
    limit: PAGE_SIZE,
  };

  const { data: invData, isLoading, isError, refetch } = useListInvoices(listParams);
  const { data: dashData } = useSalesDashboard();
  const invoices = invData?.invoices ?? [];
  const total = invData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusCounts = useMemo(() => {
    const ibs = dashData?.invoiceByStatus ?? {};
    const counts: Record<string, number> = {
      all: Object.values(ibs).reduce((sum, v) => sum + (v.count ?? 0), 0),
    };
    for (const s of STATUS_TABS) {
      if (s === "all") continue;
      counts[s] = ibs[s]?.count ?? 0;
    }
    return counts;
  }, [dashData]);

  const totalDue = invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paidAmount), 0);
  const paidCount = dashData?.invoiceByStatus?.paid?.count ?? statusCounts.paid ?? 0;
  const unpaidCount = dashData?.invoiceByStatus?.unpaid?.count ?? statusCounts.unpaid ?? 0;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Invoices"
        description="Generate, send, and track billing after proposal approval."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Invoices" },
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => setFromProposalOpen(true)}
            >
              <FileDown className="h-3.5 w-3.5" />
              From proposal
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New invoice
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total invoices", value: statusCounts.all || total, icon: Receipt, accent: "blue", delay: 0 },
          { title: "Paid", value: paidCount, icon: Receipt, accent: "green", delay: 1 },
          { title: "Unpaid", value: unpaidCount, icon: Receipt, accent: "amber", delay: 2 },
          { title: "Outstanding", value: formatCurrency(dashData?.outstanding ?? totalDue), icon: Receipt, accent: "red", alert: true, delay: 3 },
        ]}
      />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search invoice # or customer…" />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState icon={Receipt} title="Failed to load invoices" description="Could not fetch invoices." actionLabel="Retry" onAction={() => refetch()} />
      ) : total === 0 ? (
        <SalesEmptyState icon={Receipt} title="No invoices found" description="Adjust filters or create a new invoice." actionLabel="New invoice" onAction={() => setCreateOpen(true)} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice #</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Installment</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono">
                    <Link href={`/sales/invoices/${inv.id}`} className="hover:text-primary">{inv.number}</Link>
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate text-muted-foreground">
                    Customer #{inv.customerId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                    {inv.installmentId ? `Installment #${inv.installmentId}` : "—"}
                  </TableCell>
                  <TableCell>
                    <SalesStatusBadge variant="invoice" value={inv.status} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/sales/invoices/${inv.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} invoice{total === 1 ? "" : "s"}
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

      <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
      <InvoiceFromProposalDialog open={fromProposalOpen} onOpenChange={setFromProposalOpen} />
    </PortalPageShell>
  );
}
