import { useMemo, useState } from "react";
import { format } from "date-fns";
import { IndianRupee, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import { useDeleteLegalExpense, useLegalExpenses } from "@/api/legal";
import { EXPENSE_CATEGORY_LABELS, formatCurrency, formatCompactCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalExpenseFormModal,
  legalDateRangeBounds,
} from "@/modules/legal/components";
import type { LegalExpense } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function LegalExpenses() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("ytd");
  const { data, isLoading, isError, refetch } = useLegalExpenses({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalExpense();
  const crud = useLegalListCrud<LegalExpense>();
  const rows = data?.expenses ?? [];
  const { start, end } = useMemo(() => legalDateRangeBounds(dateRange), [dateRange]);

  const ranged = useMemo(
    () =>
      rows.filter((e) => {
        const t = new Date(e.date).getTime();
        return !Number.isNaN(t) && t >= start.getTime() && t <= end.getTime();
      }),
    [rows, start, end],
  );

  const ytd = useMemo(
    () => ranged.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [ranged],
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of ranged) {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    }
    return map;
  }, [ranged]);

  const categoryBreakdown = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const columns = useMemo<CmsColumn<LegalExpense>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: (e) => (
          <span className="text-muted-foreground">{format(new Date(e.date), "MMM d, yyyy")}</span>
        ),
      },
      { id: "category", header: "Category", cell: (e) => EXPENSE_CATEGORY_LABELS[e.category] },
      {
        id: "description",
        header: "Description",
        cell: (e) => <span className="max-w-[220px] block truncate">{e.description}</span>,
      },
      {
        id: "matterRef",
        header: "Matter ref",
        cell: (e) => <span className="font-mono text-muted-foreground">{e.matterRef}</span>,
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (e) => <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span>,
      },
      { id: "approvedBy", header: "Approved by", cell: (e) => e.approvedBy },
      {
        id: "receipt",
        header: "Receipt",
        chip: true,
        cell: (e) => (
          <Badge variant={e.receiptAttached ? "default" : "outline"} className="text-[10px]">
            {e.receiptAttached ? "Yes" : "Missing"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (e) => (
          <CmsRowActions
            label="Expense actions"
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(e)}
            onEdit={() => crud.openEdit(e)}
            onDelete={() => crud.setDeleteTarget(e)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Legal expenses"
        description="Court fees, counsel fees, arbitration, and legal operations spend."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Expenses" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Log expense
            </Button>
          ) : null
        }
      />

      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search expenses, matter refs…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <PortalKpiGrid
        columns={4}
        count={4}
        items={[
          { title: "Total YTD", value: formatCompactCurrency(ytd), icon: IndianRupee, accent: "blue", delay: 0 },
          {
            title: "Counsel fees",
            value: formatCompactCurrency(byCategory.counsel_fees ?? 0),
            icon: IndianRupee,
            accent: "violet",
            delay: 1,
          },
          {
            title: "Court & arbitration",
            value: formatCompactCurrency((byCategory.court_fees ?? 0) + (byCategory.arbitration ?? 0)),
            icon: IndianRupee,
            accent: "amber",
            delay: 2,
          },
          {
            title: "Transactions",
            value: String(ranged.length),
            icon: IndianRupee,
            accent: "green",
            delay: 3,
          },
        ]}
      />

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Spend by category
        </p>
        <div className="flex flex-wrap gap-2">
          {categoryBreakdown.map(([cat, amount]) => (
            <Badge key={cat} variant="secondary" className="text-xs gap-1">
              {EXPENSE_CATEGORY_LABELS[cat as keyof typeof EXPENSE_CATEGORY_LABELS]}:{" "}
              {formatCompactCurrency(amount)}
            </Badge>
          ))}
          {!categoryBreakdown.length ? (
            <span className="text-xs text-muted-foreground">No spend recorded yet.</span>
          ) : null}
        </div>
      </div>

      <CmsDataTable
        columns={columns}
        rows={ranged}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: IndianRupee, title: "No expenses found" }}
      />
      <LegalExpenseFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete expense?"
        description="This soft-deletes the expense record."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Expense deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete expense"),
          });
        }}
      />
    </PortalPageShell>
  );
}
