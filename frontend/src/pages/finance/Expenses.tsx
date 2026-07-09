import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, TrendingDown, Check, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, EXPENSE_CATEGORY_LABELS, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import type { ExpenseCategory, ExpenseStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  ExpenseFormModal,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useListExpenses,
  useApproveExpense,
  useRejectExpense,
  type ListExpensesParams,
} from "@/api/finance";
import { useListProjects } from "@/api/generated/api";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

const STATUS_TABS: (ExpenseStatus | "all")[] = ["all", "pending", "approved", "rejected"];

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: projectsData } = useListProjects({ limit: 200 });

  const params: ListExpensesParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: statusTab === "all" ? undefined : (statusTab as ExpenseStatus),
      category: categoryFilter === "all" ? undefined : (categoryFilter as ExpenseCategory),
      projectId: projectFilter === "all" ? undefined : Number(projectFilter),
    }),
    [page, search, statusTab, categoryFilter, projectFilter],
  );
  const { data, isLoading, isError, refetch } = useListExpenses(params);
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyTotal = expenses
    .filter((e) => e.date.startsWith(currentMonthKey) && e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);
  const yearlyTotal = expenses.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;

  const handleApproval = async (id: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") await approveExpense.mutateAsync(id);
      else await rejectExpense.mutateAsync(id);
      toast.success(`Expense #${id} ${action === "approve" ? "approved" : "rejected"}`);
    } catch (err) {
      toastApiError(err, `Failed to ${action} expense`);
    }
  };

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
        title="Expenses"
        description="Track, approve, and analyse company spending."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Expenses" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add expense
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "This month (approved)", value: formatCurrency(monthlyTotal), icon: TrendingDown, accent: "red", delay: 0 },
          { title: "This page (approved)", value: formatCurrency(yearlyTotal), icon: TrendingDown, accent: "amber", delay: 1 },
          { title: "Pending approvals", value: pendingCount, icon: TrendingDown, accent: "violet", alert: pendingCount > 0, delay: 2 },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search reference, vendor, notes…"
        onExport={() => toast.success("Expenses export started")}
      >
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
              <SelectItem key={k} value={k}>{EXPENSE_CATEGORY_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projectsData?.projects ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FinanceFilterBar>

      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {expenses.length === 0 ? (
        <FinanceEmptyState icon={TrendingDown} title="No expenses found" description="Adjust filters or add a new expense." actionLabel="Add expense" onAction={() => setDrawerOpen(true)} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs font-mono">{e.reference}</TableCell>
                  <TableCell><FinanceStatusBadge variant="expenseCategory" value={e.category} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{e.projectName ?? "—"}</TableCell>
                  <TableCell><FinanceStatusBadge variant="expense" value={e.status} /></TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-xs">{PAYMENT_MODE_LABELS[e.paymentMode]}</TableCell>
                  <TableCell className="text-right">
                    {e.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => handleApproval(e.id, "approve")}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleApproval(e.id, "reject")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t">
            <span>{total} total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={expenses.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <ExpenseFormModal open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => refetch()} />
    </PortalPageShell>
  );
}
