import { useMemo, useState } from "react";
import { format } from "date-fns";
import { TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockCaExpenses, expenseSummaryByPeriod } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, EXPENSE_CATEGORY_LABELS } from "@/modules/ca/constants";
import type { PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const summary = expenseSummaryByPeriod[period];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaExpenses.filter(
      (e) => !q || e.description.toLowerCase().includes(q) || EXPENSE_CATEGORY_LABELS[e.category].toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Expense management"
        description="Operating expenses by category — rent, salary, software, hosting, and more"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Expenses" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search expenses…" period={period} onPeriodChange={setPeriod} />
      <PortalKpiGrid
        columns={4}
        items={[
          { title: "Total", value: formatCompactCurrency(summary.total), icon: TrendingDown, accent: "red", delay: 0 },
          { title: "Salary", value: formatCompactCurrency(summary.salary), icon: TrendingDown, accent: "violet", delay: 1 },
          { title: "Rent", value: formatCompactCurrency(summary.rent), icon: TrendingDown, accent: "amber", delay: 2 },
          { title: "Software + hosting", value: formatCompactCurrency(summary.software + summary.hosting), icon: TrendingDown, accent: "blue", delay: 3 },
        ]}
      />
      {filtered.length === 0 ? (
        <CAEmptyState icon={TrendingDown} title="No expenses found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">GST eligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs">{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{e.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.vendor ?? "—"}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(e.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={e.gstEligible ? "default" : "outline"} className="text-[10px]">{e.gstEligible ? "Yes" : "No"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
