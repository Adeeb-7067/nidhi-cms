import { useMemo } from "react";
import { format } from "date-fns";
import { Scale } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockRocFilings } from "@/modules/ca/mock-data";
import { FILING_STATUS_LABELS, ROC_FORM_LABELS } from "@/modules/ca/constants";
import type { FilingStatus, RocFiling } from "@/modules/ca/types";
import { CAPageHeader } from "@/modules/ca/components";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

export default function Roc() {
  const filed = mockRocFilings.filter((f) => f.status === "filed").length;
  const pending = mockRocFilings.filter((f) => f.status === "pending").length;
  const overdue = mockRocFilings.filter((f) => f.status === "overdue").length;

  const columns = useMemo<CmsColumn<RocFiling>[]>(
    () => [
      {
        id: "form",
        header: "Form",
        cell: (f) => <span className="font-medium">{ROC_FORM_LABELS[f.form]}</span>,
      },
      { id: "fy", header: "Financial year", cell: (f) => f.financialYear },
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

  return (
    <PortalPageShell>
      <CAPageHeader
        title="ROC compliance"
        description="AOC-4, MGT-7, ADT-1, DIR-3 KYC — filed, pending, and overdue"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "ROC" }]}
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Filed", value: String(filed), icon: Scale, accent: "green", delay: 0 },
          { title: "Pending", value: String(pending), icon: Scale, accent: "amber", alert: pending > 0, delay: 1 },
          { title: "Overdue", value: String(overdue), icon: Scale, accent: "red", alert: overdue > 0, delay: 2 },
        ]}
      />
      <CmsDataTable columns={columns} rows={mockRocFilings} rowKey={(f) => f.id} />
    </PortalPageShell>
  );
}
