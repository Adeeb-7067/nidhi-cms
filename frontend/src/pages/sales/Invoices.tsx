import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt, FileDown } from "lucide-react";
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
import { dashboardKpis, mockInvoices, invoiceSummary } from "@/modules/sales/mock-data";
import { formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
} from "@/modules/sales/components";
import { toast } from "sonner";

type InvoiceStatus = "paid" | "unpaid" | "partial" | "overdue";

const STATUS_TABS: (InvoiceStatus | "all")[] = ["all", "unpaid", "partial", "paid", "overdue"];

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockInvoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || inv.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockInvoices.length };
    for (const s of STATUS_TABS) {
      if (s === "all") continue;
      counts[s] = mockInvoices.filter((i) => i.status === s).length;
    }
    return counts;
  }, []);

  const totalDue = mockInvoices.reduce(
    (s, i) => s + Math.max(0, i.amount - i.paidAmount),
    0,
  );

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Invoices"
        description="Generate, send, and track billing after proposal approval."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Invoices" },
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => toast.success("Convert from proposal (demo)")}
            >
              <FileDown className="h-3.5 w-3.5" />
              From proposal
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Create invoice (demo)")}>
              <Plus className="h-3.5 w-3.5" />
              New invoice
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total invoices", value: dashboardKpis.invoices, icon: Receipt, accent: "blue", delay: 0 },
          { title: "Paid", value: invoiceSummary[0].count, icon: Receipt, accent: "green", delay: 1 },
          { title: "Unpaid", value: invoiceSummary[1].count, icon: Receipt, accent: "amber", delay: 2 },
          { title: "Outstanding", value: formatCurrency(totalDue), icon: Receipt, accent: "red", alert: true, delay: 3 },
        ]}
      />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search invoice # or customer…" />

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
        <SalesEmptyState icon={Receipt} title="No invoices found" description="Adjust filters or create a new invoice." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice #</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Installment</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono">
                    <Link href={`/sales/invoices/${inv.id}`} className="hover:text-primary">{inv.number}</Link>
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate">{inv.customer}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{inv.installmentName ?? "—"}</TableCell>
                  <TableCell>
                    <SalesStatusBadge variant="invoice" value={inv.status} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/sales/invoices/${inv.id}`}>View</Link>
                    </Button>
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