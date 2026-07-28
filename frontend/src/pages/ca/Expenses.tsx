import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Plus, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useListExpenses, type Expense } from "@/api/finance";
import { formatCompactCurrency, formatCurrency } from "@/modules/ca/constants";
import type { PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CaRefLink, CaRowActions } from "@/modules/ca/components";
import {
  filterByPeriod,
  financeExpenseCategoryLabel,
  summarizeExpensesByCategory,
} from "@/modules/ca/adapters/finance";
import { financeExpenseHref, financeVendorHref } from "@/modules/ca/routes";

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const { data, isLoading, isError, refetch } = useListExpenses({
    limit: 200,
    search: search || undefined,
  });

  const expenses = useMemo(
    () => filterByPeriod(data?.expenses ?? [], period),
    [data?.expenses, period],
  );
  const summary = useMemo(() => summarizeExpensesByCategory(expenses), [expenses]);

  const columns = useMemo<CmsColumn<Expense>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: (e) => (
          <span className="text-muted-foreground">{format(new Date(e.date), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: (e) => financeExpenseCategoryLabel(e.category),
      },
      {
        id: "description",
        header: "Description",
        cell: (e) => (
          <CaRefLink href={financeExpenseHref(e.id)} className="max-w-[220px] truncate block">
            {e.notes || e.reference}
          </CaRefLink>
        ),
      },
      {
        id: "reference",
        header: "Reference",
        cell: (e) => (
          <CaRefLink href={financeExpenseHref(e.id)} mono>
            {e.reference}
          </CaRefLink>
        ),
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: (e) =>
          e.vendorId ? (
            <CaRefLink href={financeVendorHref(e.vendorId)}>{e.vendorName ?? "Vendor"}</CaRefLink>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (e) => (
          <span className="font-medium tabular-nums">
            {formatCurrency(Number(e.recognizedAmount ?? e.amount ?? 0))}
          </span>
        ),
      },
      {
        id: "gst",
        header: "GST eligible",
        chip: true,
        cell: (e) => (
          <CmsStatusChip
            label={e.gstEnabled ? "Yes" : "No"}
            tone={e.gstEnabled ? "success" : "muted"}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (e) => (
          <CaRowActions
            canView
            canEdit
            canDelete={false}
            onView={() => {
              window.location.href = financeExpenseHref(e.id);
            }}
            onEdit={() => {
              window.location.href = financeExpenseHref(e.id);
            }}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Expense management"
        description="Operating expenses from Finance — click a reference to open the bill"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Expenses" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" asChild>
            <Link href={financeExpenseHref(null, { create: true })}>
              <Plus className="h-3.5 w-3.5" /> Add in Finance
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
        }
      />
      <CAFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search expenses…"
        period={period}
        onPeriodChange={setPeriod}
      />
      <PortalKpiGrid
        columns={4}
        items={[
          { title: "Total", value: formatCompactCurrency(summary.total), icon: TrendingDown, accent: "red", delay: 0 },
          { title: "Professional", value: formatCompactCurrency(summary.salary), icon: TrendingDown, accent: "violet", delay: 1 },
          { title: "Office", value: formatCompactCurrency(summary.rent), icon: TrendingDown, accent: "amber", delay: 2 },
          {
            title: "Software + hardware",
            value: formatCompactCurrency(summary.software + summary.hosting),
            icon: TrendingDown,
            accent: "blue",
            delay: 3,
          },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={expenses}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        onRowClick={(e) => {
          window.location.href = financeExpenseHref(e.id);
        }}
        empty={{
          icon: TrendingDown,
          title: "No expenses found",
          actionLabel: "Open Finance expenses",
          onAction: () => {
            window.location.href = financeExpenseHref();
          },
        }}
      />
    </PortalPageShell>
  );
}
