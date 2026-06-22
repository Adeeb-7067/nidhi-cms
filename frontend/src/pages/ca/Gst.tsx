import { useState } from "react";
import { format } from "date-fns";
import { Receipt, AlertCircle } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { gstSummaryMay2026, mockGstFilings, mockGstNotices, gstPenaltyMonitor } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, FILING_STATUS_LABELS, NOTICE_WORKFLOW_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const filingStyles = {
  filed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
};

export default function Gst() {
  const [dateRange, setDateRange] = useState("jun");
  const gst = gstSummaryMay2026;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="GST management"
        description="Output vs input tax, GSTR-1/3B filings, notices, and penalty monitor"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "GST" }]}
      />
      <CAFilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Output tax", value: formatCompactCurrency(gst.outputTax), icon: Receipt, accent: "blue", delay: 0 },
          { title: "Input tax credit", value: formatCompactCurrency(gst.inputTax), icon: Receipt, accent: "green", delay: 1 },
          { title: "Net liability", value: formatCompactCurrency(gst.netLiability), icon: Receipt, accent: "amber", alert: true, delay: 2 },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[10px] uppercase text-muted-foreground">Late fees</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold">{formatCurrency(gstPenaltyMonitor.lateFeesAccrued)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[10px] uppercase text-muted-foreground">Interest on delay</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold text-amber-700">{formatCurrency(gstPenaltyMonitor.interestOnDelay)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[10px] uppercase text-muted-foreground">Open notices</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold text-red-600">{gstPenaltyMonitor.noticesOpen}</CardContent>
        </Card>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3">Return filings — {gst.period}</p>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Return</TableHead>
              <TableHead className="text-xs">Period</TableHead>
              <TableHead className="text-xs">Due date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Filed on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockGstFilings.map((f) => (
              <TableRow key={f.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-medium">{f.returnType}</TableCell>
                <TableCell className="text-xs">{f.period}</TableCell>
                <TableCell className="text-xs">{format(new Date(f.dueDate), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filingStyles[f.status]}`}>
                    {FILING_STATUS_LABELS[f.status]}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.filedAt ? format(new Date(f.filedAt), "MMM d, yyyy") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> GST notices
        </p>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs">Subject</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockGstNotices.map((n) => (
              <TableRow key={n.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-mono">{n.reference}</TableCell>
                <TableCell className="text-xs">{n.subject}</TableCell>
                <TableCell className="text-xs text-right">{n.amount ? formatCurrency(n.amount) : "—"}</TableCell>
                <TableCell className="text-xs capitalize">{NOTICE_WORKFLOW_LABELS[n.status]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
