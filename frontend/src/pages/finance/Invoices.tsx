import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt, FileDown, Mail } from "lucide-react";
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
import { mockFinanceInvoices, invoiceAgingBuckets } from "@/modules/finance/mock-data";
import { formatCurrency, calcInvoiceTotal } from "@/modules/finance/constants";
import type { FinanceInvoiceStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinancePageLoader,
  InvoiceFormDrawer,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { useClientPagination } from "@/lib/table-pagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { toast } from "sonner";

const STATUS_TABS: (FinanceInvoiceStatus | "all")[] = ["all", "unpaid", "partially_paid", "paid", "overdue"];

export default function FinanceInvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loading } = useMockPageState();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockFinanceInvoices.filter((inv) => {
      const matchesSearch = !q || inv.number.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || inv.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  const { pageItems, pagination } = useClientPagination(filtered);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockFinanceInvoices.length };
    for (const s of STATUS_TABS) {
      if (s === "all") continue;
      counts[s] = mockFinanceInvoices.filter((i) => i.status === s).length;
    }
    return counts;
  }, []);

  const totalOutstanding = mockFinanceInvoices.reduce((s, inv) => {
    const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
    return s + Math.max(0, total - inv.paidAmount);
  }, 0);

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading invoices…" />
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
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("Bulk export started (demo)")}>
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
          { title: "Total invoices", value: mockFinanceInvoices.length, icon: Receipt, accent: "blue", delay: 0 },
          { title: "Overdue", value: statusCounts.overdue ?? 0, icon: Receipt, accent: "red", alert: true, delay: 1 },
          { title: "Outstanding", value: formatCurrency(totalOutstanding), icon: Receipt, accent: "amber", alert: true, delay: 2 },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search invoice # or client…" onExport={() => toast.success("Export started (demo)")} />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s.replace("_", " ")} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {invoiceAgingBuckets.map((b) => (
          <Card key={b.bucket}>
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">{b.bucket}</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(b.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{b.count} invoices</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <FinanceEmptyState icon={Receipt} title="No invoices found" description="Adjust filters or create a new invoice." actionLabel="Create invoice" onAction={() => setDrawerOpen(true)} />
      ) : (
        <>
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
                {pageItems.map((inv) => {
                  const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-mono">
                        <Link href={`/finance/invoices/${inv.id}`} className="hover:text-primary">{inv.number}</Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[160px] truncate">{inv.clientName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{inv.projectName ?? "—"}</TableCell>
                      <TableCell><FinanceStatusBadge variant="invoice" value={inv.status} /></TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(total)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link href={`/finance/invoices/${inv.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DataPagination {...pagination} />
        </>
      )}

      <InvoiceFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </PortalPageShell>
  );
}
