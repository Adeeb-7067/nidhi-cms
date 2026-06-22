import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockClientPayments, clientPaymentSummary } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/ca/constants";
import type { PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";
import { toast } from "sonner";

export default function ClientPayments() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");

  const summary = clientPaymentSummary[period];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockClientPayments.filter(
      (p) => !q || p.clientName.toLowerCase().includes(q) || p.invoiceRef.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Client payment summary"
        description="Incoming payments with GST / Non-GST classification"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Client payments" }]}
        actions={
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("Export started (demo)")}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search clients, invoices…" period={period} onPeriodChange={setPeriod} />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "GST payments", value: formatCompactCurrency(summary.gst), icon: CreditCard, accent: "blue", delay: 0 },
          { title: "Non-GST payments", value: formatCompactCurrency(summary.nonGst), icon: CreditCard, accent: "violet", delay: 1 },
          { title: "Total received", value: formatCompactCurrency(summary.total), icon: CreditCard, accent: "green", delay: 2 },
        ]}
      />
      {filtered.length === 0 ? (
        <CAEmptyState icon={CreditCard} title="No payments found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Classification</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">GST</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{p.clientName}</TableCell>
                  <TableCell className="text-xs font-mono">{p.invoiceRef}</TableCell>
                  <TableCell>
                    <Badge variant={p.gstClassification === "gst" ? "default" : "secondary"} className="text-[10px] uppercase">
                      {p.gstClassification === "gst" ? "GST" : "Non-GST"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(p.gstAmount)}</TableCell>
                  <TableCell className="text-xs">{PAYMENT_MODE_LABELS[p.mode]}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(p.receivedAt), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
