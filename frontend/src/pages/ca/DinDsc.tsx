import { format } from "date-fns";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockDinDscRecords, dinDscAlertThresholds } from "@/modules/ca/mock-data";
import type { DinDscRecord } from "@/modules/ca/types";
import { CAPageHeader, ComplianceStatusBadge } from "@/modules/ca/components";
import { useMemo } from "react";

export default function DinDsc() {
  const columns = useMemo<CmsColumn<DinDscRecord>[]>(
    () => [
      {
        id: "director",
        header: "Director",
        cell: (d) => <span className="font-medium">{d.directorName}</span>,
      },
      {
        id: "din",
        header: "DIN",
        cell: (d) => <span className="font-mono">{d.din}</span>,
      },
      {
        id: "expiry",
        header: "DSC expiry",
        cell: (d) => format(new Date(d.dscExpiry), "MMM d, yyyy"),
      },
      {
        id: "days",
        header: "Days to expiry",
        cell: (d) => (
          <span
            className={`tabular-nums font-medium ${
              d.daysToExpiry <= 30
                ? "text-red-600"
                : d.daysToExpiry <= 60
                  ? "text-amber-700"
                  : ""
            }`}
          >
            {d.daysToExpiry}d
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (d) => <ComplianceStatusBadge status={d.dscStatus} />,
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="DIN / DSC management"
        description="Director compliance — DSC renewal alerts at 90, 60, and 30 days"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "DIN / DSC" }]}
      />
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {dinDscAlertThresholds.map((t) => (
          <span key={t} className="rounded-full border px-2 py-1 bg-muted/50">
            Alert at {t} days
          </span>
        ))}
      </div>
      <CmsDataTable columns={columns} rows={mockDinDscRecords} rowKey={(d) => d.id} />
    </PortalPageShell>
  );
}
