import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Receipt, AlertCircle } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { gstSummaryMay2026, mockGstFilings, mockGstNotices, gstPenaltyMonitor } from "@/modules/ca/mock-data";
import {
  formatCompactCurrency,
  formatCurrency,
  FILING_STATUS_LABELS,
  NOTICE_WORKFLOW_LABELS,
} from "@/modules/ca/constants";
import type { FilingStatus, GstReturnFiling, GstNotice, NoticeWorkflowStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

const noticeTone: Record<NoticeWorkflowStatus, "info" | "warning" | "accent" | "success"> = {
  received: "info",
  assigned: "warning",
  replied: "accent",
  closed: "success",
};

export default function Gst() {
  const [dateRange, setDateRange] = useState("jun");
  const gst = gstSummaryMay2026;

  const filingColumns = useMemo<CmsColumn<GstReturnFiling>[]>(
    () => [
      {
        id: "return",
        header: "Return",
        cell: (f) => <span className="font-medium">{f.returnType}</span>,
      },
      { id: "period", header: "Period", cell: (f) => f.period },
      {
        id: "due",
        header: "Due date",
        cell: (f) => format(new Date(f.dueDate), "MMM d, yyyy"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (f) => (
          <CmsStatusChip label={FILING_STATUS_LABELS[f.status]} tone={filingTone[f.status]} />
        ),
      },
      {
        id: "filed",
        header: "Filed on",
        cell: (f) => (
          <span className="text-muted-foreground">
            {f.filedAt ? format(new Date(f.filedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const noticeColumns = useMemo<CmsColumn<GstNotice>[]>(
    () => [
      {
        id: "reference",
        header: "Reference",
        cell: (n) => <span className="font-mono">{n.reference}</span>,
      },
      { id: "subject", header: "Subject", cell: (n) => n.subject },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (n) => (n.amount ? formatCurrency(n.amount) : "—"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (n) => (
          <CmsStatusChip label={NOTICE_WORKFLOW_LABELS[n.status]} tone={noticeTone[n.status]} />
        ),
      },
    ],
    [],
  );

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
          {
            title: "Net liability",
            value: formatCompactCurrency(gst.netLiability),
            icon: Receipt,
            accent: "amber",
            alert: true,
            delay: 2,
          },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] uppercase text-muted-foreground">Late fees</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold">
            {formatCurrency(gstPenaltyMonitor.lateFeesAccrued)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] uppercase text-muted-foreground">Interest on delay</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold text-amber-700">
            {formatCurrency(gstPenaltyMonitor.interestOnDelay)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] uppercase text-muted-foreground">Open notices</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold text-red-600">
            {gstPenaltyMonitor.noticesOpen}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Return filings — {gst.period}
        </p>
        <CmsDataTable columns={filingColumns} rows={mockGstFilings} rowKey={(f) => f.id} />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> GST notices
        </p>
        <CmsDataTable columns={noticeColumns} rows={mockGstNotices} rowKey={(n) => n.id} />
      </div>
    </PortalPageShell>
  );
}
