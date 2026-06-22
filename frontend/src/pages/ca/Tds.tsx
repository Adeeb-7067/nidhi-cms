import { format } from "date-fns";
import { Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tdsSummaryQ4, mockTdsReturns, mockTdsCertificates } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const filingStyles = {
  filed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
};

export default function Tds() {
  const tds = tdsSummaryQ4;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="TDS management"
        description="Deducted, receivable, and payable — quarterly returns and Form 16/16A"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "TDS" }]}
      />
      <CAFilterBar dateRange="q1" onDateRangeChange={() => {}} />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "TDS deducted", value: formatCompactCurrency(tds.deducted), icon: Percent, accent: "blue", delay: 0 },
          { title: "TDS receivable", value: formatCompactCurrency(tds.receivable), icon: Percent, accent: "green", delay: 1 },
          { title: "TDS payable", value: formatCompactCurrency(tds.payable), icon: Percent, accent: "amber", alert: true, delay: 2 },
        ]}
      />
      <div className="rounded-xl border bg-card overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3">Quarterly returns — {tds.quarter}</p>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Return</TableHead>
              <TableHead className="text-xs">Quarter</TableHead>
              <TableHead className="text-xs">Due date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTdsReturns.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-medium">{r.returnType}</TableCell>
                <TableCell className="text-xs">{r.quarter}</TableCell>
                <TableCell className="text-xs">{format(new Date(r.dueDate), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filingStyles[r.status]}`}>
                    {FILING_STATUS_LABELS[r.status]}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3">Form 16 / 16A certificates</p>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Form</TableHead>
              <TableHead className="text-xs">Party</TableHead>
              <TableHead className="text-xs">PAN</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTdsCertificates.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-medium">Form {c.form}</TableCell>
                <TableCell className="text-xs">{c.party}</TableCell>
                <TableCell className="text-xs font-mono">{c.pan}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{formatCurrency(c.amount)}</TableCell>
                <TableCell>
                  <Badge variant={c.issued ? "default" : "outline"} className="text-[10px]">{c.issued ? "Issued" : "Pending"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
