import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { HandCoins, Plus, Pencil, Trash2, AlertTriangle, Eye } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/modules/finance/constants";
import type { LoanStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
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

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "active", "closed"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {t === "all" ? "All" : t} (
              {t === "all" ? loans.length : loans.filter((l) => l.status === (t as LoanStatus)).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <FinanceEmptyState
          icon={HandCoins}
          title="No loans found"
          description="Add a loan you’ve taken, then link monthly EMI expenses to it."
          actionLabel="Add loan"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Loan</TableHead>
                <TableHead className="text-xs">Lender</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Repaid</TableHead>
                <TableHead className="text-xs text-right">Principal</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs text-right">Remaining</TableHead>
                <TableHead className="text-xs text-right">EMI</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const pct = repaymentPct(l.paidAmount, l.principal);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">
                      <Link href={`/finance/loans/${l.id}`} className="hover:text-primary">
                        <div className="font-medium">{l.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{l.reference}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.lender}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(l.startDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <FinanceStatusBadge variant="loan" value={l.status} />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <Progress value={pct} className="h-1.5" />
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(l.principal)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(l.paidAmount)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-right tabular-nums font-medium",
                        l.remainingAmount > 0 ? "text-amber-700" : "text-emerald-700",
                      )}
                    >
                      {formatCurrency(l.remainingAmount)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {l.emiAmount != null ? formatCurrency(l.emiAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild title="View">
                          <Link href={`/finance/loans/${l.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => setDeleteTarget(l)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="px-4 py-3 text-xs text-muted-foreground border-t">
            {formatCurrency(totalPrincipal)} principal across {loans.length} loans
          </div>
        </div>
      )}

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
