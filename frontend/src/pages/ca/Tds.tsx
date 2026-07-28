import { useMemo } from "react";
import { format } from "date-fns";
import { Percent } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { tdsSummaryQ4, mockTdsReturns, mockTdsCertificates } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import type { FilingStatus, TdsCertificate, TdsReturn } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

export default function Tds() {
  const tds = tdsSummaryQ4;

  const returnColumns = useMemo<CmsColumn<TdsReturn>[]>(
    () => [
      {
        id: "return",
        header: "Return",
        cell: (r) => <span className="font-medium">{r.returnType}</span>,
      },
      { id: "quarter", header: "Quarter", cell: (r) => r.quarter },
      {
        id: "due",
        header: "Due date",
        cell: (r) => format(new Date(r.dueDate), "MMM d, yyyy"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (r) => (
          <CmsStatusChip label={FILING_STATUS_LABELS[r.status]} tone={filingTone[r.status]} />
        ),
      },
    ],
    [],
  );

  const certColumns = useMemo<CmsColumn<TdsCertificate>[]>(
    () => [
      {
        id: "form",
        header: "Form",
        cell: (c) => <span className="font-medium">Form {c.form}</span>,
      },
      { id: "party", header: "Party", cell: (c) => c.party },
      {
        id: "pan",
        header: "PAN",
        cell: (c) => <span className="font-mono">{c.pan}</span>,
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (c) => <span className="tabular-nums">{formatCurrency(c.amount)}</span>,
      },
      {
        id: "issued",
        header: "Issued",
        chip: true,
        cell: (c) => (
          <CmsStatusChip
            label={c.issued ? "Issued" : "Pending"}
            tone={c.issued ? "success" : "warning"}
          />
        ),
      },
    ],
    [],
  );

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
          {
            title: "TDS payable",
            value: formatCompactCurrency(tds.payable),
            icon: Percent,
            accent: "amber",
            alert: true,
            delay: 2,
          },
        ]}
      />

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quarterly returns — {tds.quarter}
        </p>
        <CmsDataTable columns={returnColumns} rows={mockTdsReturns} rowKey={(r) => r.id} />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Form 16 / 16A certificates
        </p>
        <CmsDataTable columns={certColumns} rows={mockTdsCertificates} rowKey={(c) => c.id} />
      </div>
    </PortalPageShell>
  );
}
