import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/modules/finance/constants";
import type { FinanceInvoiceStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  InvoiceFormModal,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListInvoices, useInvoiceAging, type ListInvoicesParams } from "@/api/finance";
import { toast } from "sonner";

const STATUS_TABS: (FinanceInvoiceStatus | "all")[] = ["all", "unpaid", "partially_paid", "paid", "overdue"];

export default function FinanceInvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const params: ListInvoicesParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: statusTab === "all" ? undefined : (statusTab as FinanceInvoiceStatus),
    }),
    [page, search, statusTab],
  );
  const { data, isLoading, isError, refetch } = useListInvoices(params);
  const { data: agingData } = useInvoiceAging();

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const buckets = agingData?.buckets ?? [];

  const { data: allInvoicesForCounts } = useListInvoices({ limit: 500 });
  const statusCounts = useMemo(() => {
    const rows = allInvoicesForCounts?.invoices ?? [];
    const counts: Record<string, number> = { all: rows.length };
    for (const s of STATUS_TABS) {
      if (s === "all") continue;
      counts[s] = rows.filter((i) => i.status === s).length;
    }
    return counts;
  }, [allInvoicesForCounts]);
  const totalOutstanding = (allInvoicesForCounts?.invoices ?? []).reduce(
    (s, inv) => s + Math.max(0, (inv.total ?? 0) - inv.paidAmount),
    0,
  );

  if (isLoading) {
    return <FinanceListPageSkeleton kpiCount={3} />;
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Invoices"
        description="Create, track, and manage client billing documents."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Invoices" }]}
        actions={
          <>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("Bulk export started")}>
              <FileDown className="h-3.5 w-3.5" />
              Export all
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create invoice
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total invoices", value: statusCounts.all ?? 0, icon: Receipt, accent: "blue", delay: 0 },
          { title: "Overdue", value: statusCounts.overdue ?? 0, icon: Receipt, accent: "red", alert: (statusCounts.overdue ?? 0) > 0, delay: 1 },
          { title: "Outstanding", value: formatCurrency(totalOutstanding), icon: Receipt, accent: "amber", alert: totalOutstanding > 0, delay: 2 },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search invoice # or client…" onExport={() => toast.success("Export started")} />

      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s.replace("_", " ")} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {buckets.map((b) => (
          <Card key={b.bucket}>
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">{b.bucket}</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(b.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{b.count} invoices</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 ? (
        <FinanceEmptyState icon={Receipt} title="No invoices found" description="Adjust filters or create a new invoice." actionLabel="Create invoice" onAction={() => setDrawerOpen(true)} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice #</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono">
                    <Link href={`/finance/invoices/${inv.id}`} className="hover:text-primary">{inv.number}</Link>
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[160px] truncate">{inv.clientName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{inv.projectName ?? "—"}</TableCell>
                  <TableCell><FinanceStatusBadge variant="invoice" value={inv.status} /></TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(inv.total ?? 0)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/finance/invoices/${inv.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t">
            <span>{total} total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={invoices.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <InvoiceFormModal open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => refetch()} />
    </PortalPageShell>
  );
}
