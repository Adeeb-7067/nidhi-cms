import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Plus, TrendingDown, Check, X, Pencil, Trash2, Wallet, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_STATUS_LABELS,
} from "@/modules/finance/constants";
import type { ExpenseCategory, ExpensePaymentStatus, ExpenseStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceErrorState,
  ExpenseFormModal,
  FinanceConfirmDialog,
  PayrollByDepartmentCard,
  ApproveExpenseModal,
  PayExpenseRemainingModal,
  ExpenseBillDetailSheet,
  GstClassificationBadge,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useListExpenses,
  useRejectExpense,
  useDeleteExpense,
  type ListExpensesParams,
  type Expense,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { useListProjects } from "@/api/generated/api";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

const STATUS_TABS: (ExpenseStatus | "all")[] = ["all", "pending", "approved", "rejected"];
const SETTLEMENT_OPTIONS: (ExpensePaymentStatus | "all")[] = ["all", "unpaid", "partially_paid", "paid"];
const PAGE_LIMIT = 20;

function recognizedOf(e: Expense) {
  if (e.status !== "approved") return 0;
  if (e.recognizedAmount != null) return e.recognizedAmount;
  if (e.paymentStatus == null && e.paidAmount == null) return e.amount;
  return e.paidAmount ?? 0;
}

function remainingOf(e: Expense) {
  if (e.status !== "approved") return 0;
  if (e.remainingDue != null) return e.remainingDue;
  if (e.paymentStatus == null && e.paidAmount == null) return 0;
  return Math.max(0, e.amount - (e.paidAmount ?? 0));
}

export default function ExpensesPage() {
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") ?? "";
  });
  const [statusTab, setStatusTab] = useState<string>("all");
  const [settlementFilter, setSettlementFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [approveTarget, setApproveTarget] = useState<Expense | null>(null);
  const [payTarget, setPayTarget] = useState<Expense | null>(null);
  const [detailId, setDetailId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("id");
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const { can } = usePermissions();
  const canEdit = can("finance_expenses", "edit");
  const canDelete = can("finance_expenses", "delete");
  const deleteExpense = useDeleteExpense();

  // Deep-link from CA / other portals: /finance/expenses?id=123
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("id");
    const id = raw ? Number(raw) : NaN;
    if (Number.isFinite(id) && id > 0) setDetailId(id);
  }, []);

  const { data: projectsData } = useListProjects({ limit: 200 });

  const params: ListExpensesParams = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: search || undefined,
      status: statusTab === "all" ? undefined : (statusTab as ExpenseStatus),
      paymentStatus:
        settlementFilter === "all" ? undefined : (settlementFilter as ExpensePaymentStatus),
      category: categoryFilter === "all" ? undefined : (categoryFilter as ExpenseCategory),
      projectId: projectFilter === "all" ? undefined : Number(projectFilter),
    }),
    [page, search, statusTab, settlementFilter, categoryFilter, projectFilter],
  );
  const { data, isLoading, isError, refetch } = useListExpenses(params);
  const rejectExpense = useRejectExpense();

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyPaid = expenses
    .filter((e) => e.date.startsWith(currentMonthKey) && e.status === "approved")
    .reduce((s, e) => s + recognizedOf(e), 0);
  const pageDueTotal = expenses.reduce((s, e) => s + remainingOf(e), 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const openBillsCount = expenses.filter((e) => e.status === "approved" && remainingOf(e) > 0).length;

  const refreshAll = () => {
    refetch();
  };

  const handleReject = async (expense: Expense) => {
    try {
      await rejectExpense.mutateAsync(expense.id);
      toast.success(`Expense ${expense.reference} rejected`);
      refreshAll();
    } catch (err) {
      toastApiError(err, "Failed to reject expense");
    }
  };

  const openCreate = () => {
    setEditExpense(null);
    setDrawerOpen(true);
  };

  // Deep-link from CA: /finance/expenses?create=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      openCreate();
    }
  }, []);

  const openEdit = (expense: Expense) => {
    setDetailId(null);
    setEditExpense(expense);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      toast.success(`Expense ${deleteTarget.reference} deleted`);
      setDeleteTarget(null);
      refreshAll();
    } catch (err) {
      toastApiError(err, "Failed to delete expense");
    }
  };

  if (isLoading) {
    return <FinanceListPageSkeleton kpiCount={4} />;
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const columns: CmsColumn<Expense>[] = [
    {
      id: "date",
      header: "Date",
      cell: (e) => format(new Date(e.date), "MMM d, yyyy"),
    },
    {
      id: "reference",
      header: "Reference",
      cell: (e) => (
        <div className="font-mono">
          <div>{e.reference}</div>
          {e.chequeId ? (
            <Link
              href={`/finance/cheques/${e.chequeId}`}
              className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary hover:underline"
              onClick={(ev) => ev.stopPropagation()}
            >
              Cheque {e.chequeNumber ?? e.chequeReference ?? `#${e.chequeId}`}
            </Link>
          ) : null}
        </div>
      ),
    },
    {
      id: "vendor",
      header: "Vendor",
      className: "max-w-[160px]",
      cell: (e) => (
        <>
          <div className="font-medium truncate">{e.vendorName ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {EXPENSE_CATEGORY_LABELS[e.category]}
          </div>
        </>
      ),
    },
    {
      id: "budget",
      header: "Budget",
      className: "max-w-[140px]",
      cell: (e) =>
        e.budgetName ? (
          <>
            <div className="font-medium truncate">{e.budgetName}</div>
            {e.budgetFiscalYear ? (
              <div className="text-[10px] text-muted-foreground">FY {e.budgetFiscalYear}</div>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (e) => <FinanceStatusBadge variant="expense" value={e.status} />,
    },
    {
      id: "settlement",
      header: "Settlement",
      chip: true,
      cell: (e) =>
        e.status === "approved" && e.paymentStatus ? (
          <FinanceStatusBadge variant="expensePayment" value={e.paymentStatus} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "gst",
      header: "GST",
      chip: true,
      cell: (e) => (
        <>
          <GstClassificationBadge gstEnabled={e.gstEnabled} />
          {e.gstEnabled && (e.gstAmount ?? 0) > 0 ? (
            <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
              {formatCurrency(e.gstAmount)}
            </div>
          ) : null}
        </>
      ),
    },
    {
      id: "bill",
      header: "Bill",
      align: "right",
      cell: (e) => <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span>,
    },
    {
      id: "paid",
      header: "Paid",
      align: "right",
      cell: (e) => (
        <span className="tabular-nums text-muted-foreground">
          {e.status === "approved" ? formatCurrency(recognizedOf(e)) : "—"}
        </span>
      ),
    },
    {
      id: "due",
      header: "Due",
      align: "right",
      cell: (e) => {
        const due = remainingOf(e);
        if (e.status !== "approved") return "—";
        if (due > 0) return <span className="text-amber-700 font-medium tabular-nums">{formatCurrency(due)}</span>;
        return <span className="tabular-nums">{formatCurrency(0)}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (e) => {
        const due = remainingOf(e);
        return (
          <CmsRowActions
            label={`Actions for ${e.reference}`}
            items={[
              { label: "View bill", icon: Eye, onSelect: () => setDetailId(e.id) },
              {
                label: "Approve",
                icon: Check,
                onSelect: () => setApproveTarget(e),
                hidden: !(e.status === "pending" && canEdit),
              },
              {
                label: "Reject",
                icon: X,
                onSelect: () => handleReject(e),
                hidden: !(e.status === "pending" && canEdit),
              },
              {
                label: "Edit",
                icon: Pencil,
                onSelect: () => openEdit(e),
                hidden: !(e.status === "pending" && canEdit),
              },
              {
                label: "Pay remaining",
                icon: Wallet,
                onSelect: () => setPayTarget(e),
                hidden: !(e.status === "approved" && due > 0 && canEdit && e.chequeStatus !== "issued"),
              },
              {
                label: "Delete",
                icon: Trash2,
                onSelect: () => setDeleteTarget(e),
                variant: "destructive",
                separatorBefore: true,
                hidden: !(canDelete && e.status !== "approved"),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Expenses"
        description="Bills, cash paid, and dues — open any row for full payment history. P&L uses Paid only."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Expenses" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add expense
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Paid (this page · month)", value: formatCurrency(monthlyPaid), icon: TrendingDown, accent: "red", delay: 0 },
          {
            title: "Vendor dues (this page)",
            value: formatCurrency(pageDueTotal),
            icon: Wallet,
            accent: "amber",
            alert: pageDueTotal > 0,
            delay: 1,
          },
          {
            title: "Bills awaiting payment",
            value: openBillsCount,
            icon: Wallet,
            accent: "violet",
            alert: openBillsCount > 0,
            delay: 2,
          },
          {
            title: "Pending approvals",
            value: pendingCount,
            icon: TrendingDown,
            accent: "violet",
            alert: pendingCount > 0,
            delay: 3,
          },
        ]}
      />

      <PayrollByDepartmentCard />

      <FinanceFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search reference, vendor, notes…"
        onExport={() => toast.success("Expenses export started")}
      >
        <Select
          value={settlementFilter}
          onValueChange={(v) => {
            setSettlementFilter(v);
            setPage(1);
            if (v !== "all" && statusTab !== "approved" && statusTab !== "all") {
              setStatusTab("approved");
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Settlement" />
          </SelectTrigger>
          <SelectContent>
            {SETTLEMENT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All settlements" : EXPENSE_PAYMENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
              <SelectItem key={k} value={k}>
                {EXPENSE_CATEGORY_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={projectFilter}
          onValueChange={(v) => {
            setProjectFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] h-9">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projectsData?.projects ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FinanceFilterBar>

      <CmsChipTabs
        value={statusTab}
        onValueChange={(v) => {
          setStatusTab(v);
          setPage(1);
        }}
        items={STATUS_TABS.map((s) => ({
          value: s,
          label: s === "all" ? "All" : s,
        }))}
      />

      <CmsDataTable
        columns={columns}
        rows={expenses}
        rowKey={(e) => e.id}
        onRowClick={(e) => setDetailId(e.id)}
        empty={{
          icon: TrendingDown,
          title: "No expenses found",
          description: "Adjust filters or add a new expense.",
          actionLabel: "Add expense",
          onAction: openCreate,
        }}
        pagination={{
          page,
          limit: PAGE_LIMIT,
          total,
          onPageChange: setPage,
        }}
        toolbar={
          <p className="text-xs text-muted-foreground">Click a row for full bill detail</p>
        }
      />

      <ExpenseBillDetailSheet
        expenseId={detailId}
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        canEdit={canEdit}
        onApprove={(e) => {
          setDetailId(null);
          setApproveTarget(e);
        }}
        onReject={(e) => handleReject(e)}
        onEdit={openEdit}
        onPayRemaining={(e) => {
          setDetailId(null);
          setPayTarget(e);
        }}
      />

      <ExpenseFormModal
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditExpense(null);
        }}
        expense={editExpense}
        onSuccess={() => {
          refreshAll();
          setEditExpense(null);
        }}
      />

      <ApproveExpenseModal
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
        expense={approveTarget}
        onSuccess={refreshAll}
      />

      <PayExpenseRemainingModal
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
        expense={payTarget}
        onSuccess={refreshAll}
      />

      <FinanceConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete expense?"
        description={deleteTarget ? `Delete ${deleteTarget.reference}? This cannot be undone.` : undefined}
        loading={deleteExpense.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
