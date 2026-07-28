import { useMemo, useState } from "react";
import { format } from "date-fns";
import { IndianRupee, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import { mockLegalExpenses, legalExpensesYtd, expensesByCategory } from "@/modules/legal/mock-data";
import { EXPENSE_CATEGORY_LABELS, formatCurrency, formatCompactCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
} from "@/modules/legal/components";
import { toast } from "sonner";
import type { LegalExpense } from "@/modules/legal/types";

export default function LegalExpenses() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("ytd");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockLegalExpenses.filter(
      (e) =>
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.matterRef.toLowerCase().includes(q) ||
        EXPENSE_CATEGORY_LABELS[e.category].toLowerCase().includes(q),
    );
  }, [search]);

  const categoryBreakdown = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

  const columns = useMemo<CmsColumn<LegalExpense>[]>(
    () => [
      { id: "date", header: "Date", cell: (e) => <span className="text-muted-foreground">{format(new Date(e.date), "MMM d, yyyy")}</span> },
      { id: "category", header: "Category", cell: (e) => EXPENSE_CATEGORY_LABELS[e.category] },
      { id: "description", header: "Description", cell: (e) => <span className="max-w-[220px] block truncate">{e.description}</span> },
      { id: "matterRef", header: "Matter ref", cell: (e) => <span className="font-mono text-muted-foreground">{e.matterRef}</span> },
      { id: "amount", header: "Amount", align: "right", cell: (e) => <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span> },
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
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Legal expenses"
        description="Court fees, counsel fees, arbitration, and legal operations spend."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Expenses" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => toast.success("Expense report export started (demo)")}
          >
            <Download className="h-3.5 w-3.5" />
            Export report
          </Button>
        }
      />

      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search expenses, matter refs…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Export started (demo)")}
      />

      <PortalKpiGrid
        columns={4}
        count={4}
        items={[
          { title: "Total YTD", value: formatCompactCurrency(legalExpensesYtd), icon: IndianRupee, accent: "blue", delay: 0 },
          { title: "Counsel fees", value: formatCompactCurrency(expensesByCategory.counsel_fees ?? 0), icon: IndianRupee, accent: "violet", delay: 1 },
          { title: "Court & arbitration", value: formatCompactCurrency((expensesByCategory.court_fees ?? 0) + (expensesByCategory.arbitration ?? 0)), icon: IndianRupee, accent: "amber", delay: 2 },
          { title: "Transactions", value: String(mockLegalExpenses.length), icon: IndianRupee, accent: "green", delay: 3 },
        ]}
      />

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Spend by category</p>
        <div className="flex flex-wrap gap-2">
          {categoryBreakdown.map(([cat, amount]) => (
            <Badge key={cat} variant="secondary" className="text-xs gap-1">
              {EXPENSE_CATEGORY_LABELS[cat as keyof typeof EXPENSE_CATEGORY_LABELS]}: {formatCompactCurrency(amount)}
            </Badge>
          ))}
        </div>
      </div>

      <CmsDataTable columns={columns} rows={filtered} rowKey={(e) => e.id} empty={{ icon: IndianRupee, title: "No expenses found" }} />
    </PortalPageShell>
  );
}
