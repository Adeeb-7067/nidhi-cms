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
  GstClassificationBadge,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListInvoices, useInvoiceAging, useInvoicesSummary, type ListInvoicesParams } from "@/api/finance";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";
import { FinanceSourceBadge } from "@/modules/finance/components";
import { toast } from "sonner";

const STATUS_TABS: (FinanceInvoiceStatus | "all")[] = ["all", "unpaid", "partially_paid", "paid", "overdue"];

export default function FinanceInvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const { page, setPage, resetPage, limit, apiLimit } = useTablePagination(20);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const params: ListInvoicesParams = useMemo(
    () => ({
      page,
      limit: apiLimit,
      search: search || undefined,
      status: statusTab === "all" ? undefined : (statusTab as FinanceInvoiceStatus),
    }),
    [page, apiLimit, search, statusTab],
  );
  const { data, isLoading, isError, refetch } = useListInvoices(params);
  const { data: agingData } = useInvoiceAging();
  const { data: summaryData } = useInvoicesSummary();

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const buckets = agingData?.buckets ?? [];
  const statusCounts = summaryData?.counts ?? { all: 0 };
  const totalOutstanding = summaryData?.outstanding ?? 0;
  const gstCount = summaryData?.gstCount ?? 0;
  const nonGstCount = summaryData?.nonGstCount ?? 0;
  const gstTaxTotal = summaryData?.gstTaxTotal ?? 0;

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
          { title: "GST invoices", value: gstCount, icon: Receipt, accent: "blue", delay: 1 },
          { title: "Non-GST invoices", value: nonGstCount, icon: Receipt, accent: "default", delay: 2 },
          { title: "GST on invoices", value: formatCurrency(gstTaxTotal), icon: Receipt, accent: "amber", delay: 3 },
          { title: "Overdue", value: statusCounts.overdue ?? 0, icon: Receipt, accent: "red", alert: (statusCounts.overdue ?? 0) > 0, delay: 4 },
          { title: "Outstanding", value: formatCurrency(totalOutstanding), icon: Receipt, accent: "amber", alert: totalOutstanding > 0, delay: 5 },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={(v) => { setSearch(v); resetPage(); }} searchPlaceholder="Search invoice # or client…" onExport={() => toast.success("Export started")} />

      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); resetPage(); }}>
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
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice #</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">GST</TableHead>
                <TableHead className="text-xs text-right">Tax</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const href = inv.detailHref ?? `/finance/invoices/${inv.id}`;
                return (
                  <TableRow key={`${inv.source ?? "finance"}-${inv.id}`} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono">
                      <Link href={href} className="hover:text-primary">{inv.number}</Link>
                    </TableCell>
                    <TableCell><FinanceSourceBadge source={inv.source} /></TableCell>
                    <TableCell className="text-xs font-medium max-w-[160px] truncate">{inv.clientName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{inv.projectName ?? "—"}</TableCell>
                    <TableCell><FinanceStatusBadge variant="invoice" value={inv.status} /></TableCell>
                    <TableCell><GstClassificationBadge gstEnabled={inv.gstEnabled} /></TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {inv.gstEnabled && (inv.tax ?? 0) > 0 ? formatCurrency(inv.tax ?? 0) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(inv.total ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(inv.paidAmount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={href}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-3">
            <DataPagination page={page} limit={limit} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}

      <InvoiceFormModal open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => refetch()} />
    </PortalPageShell>
  );
}
