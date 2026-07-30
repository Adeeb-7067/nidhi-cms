import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { HandCoins, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, LOAN_SOURCE_LABELS } from "@/modules/finance/constants";
import type { LoanStatus, LoanSource } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceErrorState,
  LoanFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListLoans, useDeleteLoan, type Loan } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function repaymentPct(paid: number, principal: number): number {
  if (principal <= 0) return 0;
  return Math.min(100, Math.round((paid / principal) * 100));
}

export default function LoansPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_loans", "edit");
  const canDelete = can("finance_loans", "delete");
  const deleteLoan = useDeleteLoan();
  const { data, isLoading, isError, refetch } = useListLoans();
  const loans = data?.loans ?? [];

  const openCreate = () => { setEditLoan(null); setDrawerOpen(true); };
  const openEdit = (loan: Loan) => { setEditLoan(loan); setDrawerOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLoan.mutateAsync(deleteTarget.id);
      toast.success(`Loan ${deleteTarget.reference} deleted`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete loan");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return loans.filter((l) => {
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.lender.toLowerCase().includes(q) ||
        l.reference.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || l.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [loans, search, statusTab]);

  const activeLoans = loans.filter((l) => l.status === "active");
  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);

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

  const chipItems = (["all", "active", "closed"] as const).map((t) => ({
    value: t,
    label: t === "all" ? "All" : t,
    count: t === "all" ? loans.length : loans.filter((l) => l.status === (t as LoanStatus)).length,
  }));

  const columns: CmsColumn<Loan>[] = [
    {
      id: "loan",
      header: "Loan",
      cell: (l) => (
        <Link href={`/finance/loans/${l.id}`} className="hover:text-primary">
          <div className="font-medium">{l.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{l.reference}</div>
        </Link>
      ),
    },
    { id: "lender", header: "Lender", cell: (l) => <span className="text-muted-foreground">{l.lender}</span> },
    {
      id: "source",
      header: "Source",
      cell: (l) => (
        <span className="text-muted-foreground">
          {LOAN_SOURCE_LABELS[(l.source as LoanSource) || "bank"] ?? "Bank"}
        </span>
      ),
    },
    {
      id: "start",
      header: "Start",
      cell: (l) => <span className="text-muted-foreground">{format(new Date(l.startDate), "MMM d, yyyy")}</span>,
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (l) => <FinanceStatusBadge variant="loan" value={l.status} />,
    },
    {
      id: "repaid",
      header: "Repaid",
      className: "min-w-[120px]",
      cell: (l) => {
        const pct = repaymentPct(l.paidAmount, l.principal);
        return (
          <>
            <Progress value={pct} className="h-1.5" />
            <span className="text-[10px] text-muted-foreground">{pct}%</span>
          </>
        );
      },
    },
    {
      id: "principal",
      header: "Principal",
      align: "right",
      cell: (l) => <span className="tabular-nums">{formatCurrency(l.principal)}</span>,
    },
    {
      id: "paid",
      header: "Paid",
      align: "right",
      cell: (l) => <span className="tabular-nums">{formatCurrency(l.paidAmount)}</span>,
    },
    {
      id: "remaining",
      header: "Remaining",
      align: "right",
      cell: (l) => (
        <span
          className={cn(
            "tabular-nums font-medium",
            l.remainingAmount > 0 ? "text-amber-700" : "text-emerald-700",
          )}
        >
          {formatCurrency(l.remainingAmount)}
        </span>
      ),
    },
    {
      id: "emi",
      header: "EMI",
      align: "right",
      cell: (l) => (
        <span className="tabular-nums text-muted-foreground">
          {l.emiAmount != null ? formatCurrency(l.emiAmount) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (l) => (
        <CmsRowActions
          label="Loan actions"
          viewHref={`/finance/loans/${l.id}`}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(l)}
          onDelete={() => setDeleteTarget(l)}
        />
      ),
    },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Loans"
        description="Register loans taken and track EMI repayments from monthly expenses."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Loans" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add loan
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Active loans", value: activeLoans.length, icon: HandCoins, accent: "blue", delay: 0 },
          { title: "Total outstanding", value: formatCurrency(totalOutstanding), icon: AlertTriangle, accent: "amber", delay: 1 },
          { title: "Total repaid", value: formatCurrency(totalPaid), icon: HandCoins, accent: "green", delay: 2 },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search loan, lender, reference…"
      />

      <CmsChipTabs value={statusTab} onValueChange={setStatusTab} items={chipItems} />

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(l) => l.id}
        empty={{
          icon: HandCoins,
          title: "No loans found",
          description: "Add a loan you’ve taken, then link monthly EMI expenses to it.",
          actionLabel: "Add loan",
          onAction: openCreate,
        }}
        toolbar={
          <p className="text-xs text-muted-foreground">
            {formatCurrency(totalPrincipal)} principal across {loans.length} loans
          </p>
        }
      />

      <LoanFormModal
        key={editLoan ? `edit-${editLoan.id}` : "create"}
        open={drawerOpen}
        onOpenChange={(open) => { setDrawerOpen(open); if (!open) setEditLoan(null); }}
        loan={editLoan}
        onSuccess={() => { refetch(); setEditLoan(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete loan?"
        description={
          deleteTarget
            ? `${deleteTarget.reference} will be permanently removed. Linked expenses must be cleared first.`
            : undefined
        }
        loading={deleteLoan.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
