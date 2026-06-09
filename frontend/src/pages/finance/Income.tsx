import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockIncome, financeClients, incomeVsExpenseTrend, revenueTrend } from "@/modules/finance/mock-data";
import { formatCurrency, formatCompactCurrency } from "@/modules/finance/constants";
import type { IncomeStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinancePageLoader,
  FinanceDualLineChart,
  FinanceAreaTrendChart,
  IncomeFormDrawer,
} from "@/modules/finance/components";
import { PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { useClientPagination } from "@/lib/table-pagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { toast } from "sonner";

const STATUS_TABS: (IncomeStatus | "all")[] = ["all", "received", "partial", "pending"];

export default function IncomePage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loading } = useMockPageState();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockIncome.filter((i) => {
      const matchesSearch =
        !q ||
        i.reference.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q) ||
        i.projectName?.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || i.status === statusTab;
      const matchesClient = clientFilter === "all" || String(i.clientId) === clientFilter;
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [search, statusTab, clientFilter]);

  const { pageItems, pagination } = useClientPagination(filtered);

  const totalReceived = mockIncome.filter((i) => i.status === "received").reduce((s, i) => s + i.amount, 0);
  const totalPending = mockIncome.filter((i) => i.status !== "received").reduce((s, i) => s + i.amount, 0);

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading income…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Income"
        description="Track client payments and revenue collections."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Income" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Record payment
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total received", value: formatCompactCurrency(totalReceived), icon: TrendingUp, accent: "green", delay: 0 },
          { title: "Pending / partial", value: formatCompactCurrency(totalPending), icon: TrendingUp, accent: "amber", delay: 1 },
          { title: "Transactions", value: mockIncome.length, icon: TrendingUp, accent: "blue", delay: 2 },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="Income vs expense" description="Monthly comparison" icon={TrendingUp} accent="emerald">
            <FinanceDualLineChart data={incomeVsExpenseTrend} line1Key="income" line2Key="expense" line1Label="Income" line2Label="Expense" />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Revenue trends" description="Month-over-month growth" icon={TrendingUp} accent="blue">
            <FinanceAreaTrendChart data={revenueTrend} dataKey="revenue" gradientId="revenueTrend" stroke="#3b82f6" />
          </ChartPanel>
        </ChartGridCell>
      </div>

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search client, reference…" onExport={() => toast.success("Income export started (demo)")}>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {financeClients.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FinanceFilterBar>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <FinanceEmptyState icon={TrendingUp} title="No income records" description="Adjust filters or record a payment." actionLabel="Record payment" onAction={() => setDrawerOpen(true)} />
      ) : (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((i) => (
                  <TableRow key={i.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">{format(new Date(i.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-xs font-mono">{i.reference}</TableCell>
                    <TableCell className="text-xs font-medium">{i.clientName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{i.projectName ?? "—"}</TableCell>
                    <TableCell><FinanceStatusBadge variant="income" value={i.status} /></TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums text-emerald-700">{formatCurrency(i.amount)}</TableCell>
                    <TableCell className="text-xs">{PAYMENT_MODE_LABELS[i.paymentMode]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination {...pagination} />
        </>
      )}

      <IncomeFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </PortalPageShell>
  );
}
