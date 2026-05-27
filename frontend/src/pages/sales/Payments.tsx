import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, IndianRupee, Receipt } from "lucide-react";
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
import { dashboardKpis, mockPaymentRecords } from "@/modules/sales/mock-data";
import { formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
} from "@/modules/sales/components";
import { toast } from "sonner";

export default function Payments() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockPaymentRecords.filter(
      (p) =>
        !q ||
        p.invoice.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q) ||
        p.mode.toLowerCase().includes(q),
    );
  }, [search]);

  const collected = mockPaymentRecords.reduce((s, p) => s + p.amount, 0);
  const partialCount = mockPaymentRecords.filter((p) => p.status === "partial").length;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Payments"
        description="Record full and partial payments, generate receipts, and track collections."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Payments" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Record payment (demo)")}>
            <Plus className="h-3.5 w-3.5" />
            Record payment
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Collected (MTD)", value: formatCurrency(collected), icon: IndianRupee, accent: "green", delay: 0 },
          { title: "Payments logged", value: mockPaymentRecords.length, icon: Receipt, accent: "blue", delay: 1 },
          { title: "Partial payments", value: partialCount, icon: Receipt, accent: "violet", delay: 2 },
          { title: "Due amount", value: formatCurrency(dashboardKpis.dueAmount), icon: IndianRupee, accent: "red", alert: true, delay: 3 },
        ]}
      />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search invoice, customer, or mode…" />

      {filtered.length === 0 ? (
        <SalesEmptyState icon={IndianRupee} title="No payments found" description="Record a payment against an invoice." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono">{p.invoice}</TableCell>
                  <TableCell className="text-xs font-medium">{p.customer}</TableCell>
                  <TableCell className="text-xs">{p.mode}</TableCell>
                  <TableCell>
                    <SalesStatusBadge variant="payment" value={p.status} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    {p.receiptId ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/sales/receipts/${p.receiptId}`}>{p.receiptNumber ?? "Receipt"}</Link>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.success("Receipt PDF (demo)")}>
                        Download
                      </Button>
                    )}
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
