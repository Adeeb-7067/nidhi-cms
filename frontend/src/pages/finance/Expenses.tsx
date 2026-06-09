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
import { mockExpenses, financeProjects } from "@/modules/finance/mock-data";
import { formatCurrency, EXPENSE_CATEGORY_LABELS } from "@/modules/finance/constants";
import type { ExpenseCategory, ExpenseStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinancePageLoader,
  ExpenseFormDrawer,
} from "@/modules/finance/components";
import { PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { useClientPagination } from "@/lib/table-pagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { toast } from "sonner";

const STATUS_TABS: (ExpenseStatus | "all")[] = ["all", "pending", "approved", "rejected"];

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loading } = useMockPageState();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockExpenses.filter((e) => {
      const matchesSearch =
        !q ||
        e.reference.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.vendorName?.toLowerCase().includes(q) ||
        e.employeeName?.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || e.status === statusTab;
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesProject = projectFilter === "all" || String(e.projectId) === projectFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesProject;
    });
  }, [search, statusTab, categoryFilter, projectFilter]);

  const { pageItems, pagination } = useClientPagination(filtered);

  const monthlyTotal = mockExpenses
    .filter((e) => e.date.startsWith("2026-06") && e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);
  const yearlyTotal = mockExpenses
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);
  const pendingCount = mockExpenses.filter((e) => e.status === "pending").length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockExpenses.length };
    for (const s of STATUS_TABS) {
      if (s === "all") continue;
      counts[s] = mockExpenses.filter((e) => e.status === s).length;
    }
    return counts;
  }, []);

  const handleApproval = (id: number, action: "approve" | "reject") => {
    toast.success(`Expense #${id} ${action === "approve" ? "approved" : "rejected"} (demo)`);
  };

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading expenses…" />
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
          { title: "Monthly expenses", value: formatCurrency(monthlyTotal), icon: TrendingDown, accent: "red", delay: 0 },
          { title: "Yearly expenses", value: formatCurrency(yearlyTotal), icon: TrendingDown, accent: "amber", delay: 1 },
          { title: "Pending approvals", value: pendingCount, icon: TrendingDown, accent: "violet", alert: pendingCount > 0, delay: 2 },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference, vendor, notes…"
        onExport={() => toast.success("Expenses export started (demo)")}
      >
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
              <SelectItem key={k} value={k}>{EXPENSE_CATEGORY_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {financeProjects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FinanceFilterBar>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <FinanceEmptyState icon={TrendingDown} title="No expenses found" description="Adjust filters or add a new expense." actionLabel="Add expense" onAction={() => setDrawerOpen(true)} />
      ) : (
        <>
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
                {pageItems.map((e) => (
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
          </div>
          <DataPagination {...pagination} />
        </>
      )}

      <ExpenseFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </PortalPageShell>
  );
}
