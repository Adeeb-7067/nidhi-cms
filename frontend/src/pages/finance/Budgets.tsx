import { useMemo, useState } from "react";
import { PiggyBank, AlertTriangle } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { mockBudgets } from "@/modules/finance/mock-data";
import { formatCurrency, calcBudgetConsumption } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinancePageLoader,
  BudgetConsumptionCard,
  FinanceBarChart,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BudgetsPage() {
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<string>("all");
  const { loading } = useMockPageState();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockBudgets.filter((b) => {
      const matchesSearch = !q || b.name.toLowerCase().includes(q) || b.department?.toLowerCase().includes(q);
      const matchesType = typeTab === "all" || b.type === typeTab;
      return matchesSearch && matchesType;
    });
  }, [search, typeTab]);

  const exceededCount = mockBudgets.filter((b) => b.status === "exceeded").length;
  const warningCount = mockBudgets.filter((b) => b.status === "warning").length;
  const totalAllocated = mockBudgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = mockBudgets.reduce((s, b) => s + b.spent, 0);

  const chartData = filtered.map((b) => ({
    name: b.name.length > 18 ? b.name.slice(0, 16) + "…" : b.name,
    spent: b.spent,
    allocated: b.allocated,
  }));

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading budgets…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Budgets"
        description="Annual and project budgets with variance tracking."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Budgets" }]}
        actions={
          <Button size="sm" className="h-8" onClick={() => toast.success("Create budget (demo)")}>
            Add budget
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total allocated", value: formatCurrency(totalAllocated), icon: PiggyBank, accent: "blue", delay: 0 },
          { title: "Total spent", value: formatCurrency(totalSpent), icon: PiggyBank, accent: "amber", delay: 1 },
          { title: "Overspend alerts", value: exceededCount + warningCount, icon: AlertTriangle, accent: "red", alert: exceededCount > 0, delay: 2 },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search budget name…" onExport={() => toast.success("Budget export started (demo)")} />

      <Tabs value={typeTab} onValueChange={setTypeTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "annual", "project"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {t === "all" ? "All" : t} ({t === "all" ? mockBudgets.length : mockBudgets.filter((b) => b.type === t).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="Budget vs actual" description="Spending by budget line" icon={PiggyBank} accent="violet">
            <FinanceBarChart data={chartData} dataKey="spent" nameKey="name" color="#8b5cf6" />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Consumption overview" icon={AlertTriangle} accent="amber">
            <div className="grid gap-3">
              {filtered.slice(0, 4).map((b) => (
                <BudgetConsumptionCard key={b.id} budget={b} />
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      {filtered.length === 0 ? (
        <FinanceEmptyState icon={PiggyBank} title="No budgets found" description="Adjust filters or create a new budget." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Budget</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">FY</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Consumption</TableHead>
                <TableHead className="text-xs text-right">Allocated</TableHead>
                <TableHead className="text-xs text-right">Spent</TableHead>
                <TableHead className="text-xs text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const pct = calcBudgetConsumption(b.spent, b.allocated);
                const variance = b.allocated - b.spent;
                return (
                  <TableRow key={b.id} className={cn(b.status === "exceeded" && "bg-red-500/5")}>
                    <TableCell className="text-xs font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs capitalize">{b.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.fiscalYear}</TableCell>
                    <TableCell><FinanceStatusBadge variant="budget" value={b.status} /></TableCell>
                    <TableCell className="min-w-[120px]">
                      <Progress value={pct} className={cn("h-1.5", b.status === "exceeded" && "[&>div]:bg-red-500")} />
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(b.allocated)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(b.spent)}</TableCell>
                    <TableCell className={cn("text-xs text-right tabular-nums font-medium", variance < 0 ? "text-red-700" : "text-emerald-700")}>
                      {variance < 0 ? "−" : "+"}{formatCurrency(Math.abs(variance))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
