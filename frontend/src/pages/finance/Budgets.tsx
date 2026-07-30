import { useMemo, useState } from "react";
import { PiggyBank, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, calcBudgetConsumption, moneySignClass } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  BudgetConsumptionCard,
  FinanceBarChart,
  BudgetFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceBudgetsSkeleton } from "@/components/loading";
import { useListBudgets, useDeleteBudget, type Budget } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BudgetsPage() {
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_budgets", "edit");
  const canDelete = can("finance_budgets", "delete");
  const deleteBudget = useDeleteBudget();
  const { data, isLoading, isError, refetch } = useListBudgets();
  const budgets = data?.budgets ?? [];

  const openCreate = () => { setEditBudget(null); setDrawerOpen(true); };
  const openEdit = (budget: Budget) => { setEditBudget(budget); setDrawerOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBudget.mutateAsync(deleteTarget.id);
      toast.success(`Budget "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete budget");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return budgets.filter((b) => {
      const matchesSearch = !q || b.name.toLowerCase().includes(q) || b.department?.toLowerCase().includes(q);
      const matchesType = typeTab === "all" || b.type === typeTab;
      return matchesSearch && matchesType;
    });
  }, [budgets, search, typeTab]);

  const exceededCount = budgets.filter((b) => b.status === "exceeded").length;
  const warningCount = budgets.filter((b) => b.status === "warning").length;
  const totalAllocated = budgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const chartData = filtered.map((b) => ({
    name: b.name.length > 18 ? b.name.slice(0, 16) + "…" : b.name,
    spent: b.spent,
    allocated: b.allocated,
  }));

  if (isLoading) {
    return <FinanceBudgetsSkeleton />;
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const chipItems = (["all", "annual", "project"] as const).map((value) => ({
    value,
    label: value === "all" ? "All" : value,
    count: value === "all" ? budgets.length : budgets.filter((b) => b.type === value).length,
  }));
  const columns: CmsColumn<Budget>[] = [
    { id: "budget", header: "Budget", cell: (b) => <span className="font-medium">{b.name}</span> },
    { id: "type", header: "Type", chip: true, cell: (b) => <span className="capitalize">{b.type}</span> },
    { id: "fy", header: "FY", cell: (b) => <span className="text-muted-foreground">{b.fiscalYear}</span> },
    { id: "status", header: "Status", chip: true, cell: (b) => <FinanceStatusBadge variant="budget" value={b.status} /> },
    { id: "consumption", header: "Consumption", className: "min-w-[120px]", cell: (b) => { const pct = calcBudgetConsumption(b.spent, b.allocated); return <><Progress value={pct} className={cn("h-1.5", b.status === "exceeded" && "[&>div]:bg-red-500")} /><span className="text-[10px] text-muted-foreground">{pct}%</span></>; } },
    { id: "allocated", header: "Allocated", align: "right", cell: (b) => <span className="tabular-nums">{formatCurrency(b.allocated)}</span> },
    { id: "spent", header: "Spent", align: "right", cell: (b) => <span className="tabular-nums">{formatCurrency(b.spent)}</span> },
    { id: "variance", header: "Variance", align: "right", cell: (b) => <span className={cn("font-medium tabular-nums", moneySignClass(b.allocated - b.spent))}>{formatCurrency(Math.abs(b.allocated - b.spent))}</span> },
    ...(canEdit || canDelete ? [{ id: "actions", header: "Actions", align: "right" as const, cell: (b: Budget) => (
      <CmsRowActions
        label="Budget actions"
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => openEdit(b)}
        onDelete={() => setDeleteTarget(b)}
      />
    ) }] : []),
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Budgets"
        description="Annual and project budgets with variance tracking."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Budgets" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
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

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search budget name…" onExport={() => toast.success("Budget export started")} />

      <CmsChipTabs value={typeTab} onValueChange={setTypeTab} items={chipItems} />

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

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(b) => b.id}
        getRowClassName={(b) => cn(b.status === "exceeded" && "bg-red-500/5")}
        empty={{ icon: PiggyBank, title: "No budgets found", description: "Adjust filters or create a new budget.", actionLabel: "Add budget", onAction: () => setDrawerOpen(true) }}
      />

      <BudgetFormModal
        open={drawerOpen}
        onOpenChange={(open) => { setDrawerOpen(open); if (!open) setEditBudget(null); }}
        budget={editBudget}
        onSuccess={() => { refetch(); setEditBudget(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete budget?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently removed. This does not affect recorded expenses.` : undefined}
        loading={deleteBudget.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
