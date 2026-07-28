import { useMemo, useState } from "react";
import { format } from "date-fns";
import { TrendingDown } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockCaExpenses, expenseSummaryByPeriod } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, EXPENSE_CATEGORY_LABELS } from "@/modules/ca/constants";
import type { CaExpense, PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const summary = expenseSummaryByPeriod[period];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaExpenses.filter(
      (e) =>
        !q ||
        e.description.toLowerCase().includes(q) ||
        EXPENSE_CATEGORY_LABELS[e.category].toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<CaExpense>[]>(
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
        cell: (e) => EXPENSE_CATEGORY_LABELS[e.category],
      },
      {
        id: "description",
        header: "Description",
        cell: (e) => <span className="max-w-[220px] block truncate">{e.description}</span>,
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: (e) => <span className="text-muted-foreground">{e.vendor ?? "—"}</span>,
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (e) => <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span>,
      },
      {
        id: "gst",
        header: "GST eligible",
        chip: true,
        cell: (e) => (
          <CmsStatusChip
            label={e.gstEligible ? "Yes" : "No"}
            tone={e.gstEligible ? "success" : "muted"}
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
        description="Operating expenses by category — rent, salary, software, hosting, and more"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Expenses" }]}
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
          { title: "Salary", value: formatCompactCurrency(summary.salary), icon: TrendingDown, accent: "violet", delay: 1 },
          { title: "Rent", value: formatCompactCurrency(summary.rent), icon: TrendingDown, accent: "amber", delay: 2 },
          {
            title: "Software + hosting",
            value: formatCompactCurrency(summary.software + summary.hosting),
            icon: TrendingDown,
            accent: "blue",
            delay: 3,
          },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(e) => e.id}
        empty={{ icon: TrendingDown, title: "No expenses found" }}
      />
    </PortalPageShell>
  );
}
