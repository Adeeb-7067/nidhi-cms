import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockAuditRecords, statutoryAuditorDetails } from "@/modules/ca/mock-data";
import { AUDIT_PHASE_LABELS } from "@/modules/ca/constants";
import type { AuditRecord } from "@/modules/ca/types";
import { CAPageHeader, ComplianceStatusBadge } from "@/modules/ca/components";

export default function Audit() {
  const columns = useMemo<CmsColumn<AuditRecord>[]>(
    () => [
      {
        id: "type",
        header: "Type",
        cell: (a) => <span className="capitalize font-medium">{a.type}</span>,
      },
      {
        id: "auditor",
        header: "Auditor",
        cell: (a) => <span className="max-w-[180px] block truncate">{a.auditor}</span>,
      },
      { id: "period", header: "Period", cell: (a) => a.financialYear },
      { id: "phase", header: "Phase", cell: (a) => AUDIT_PHASE_LABELS[a.phase] },
      {
        id: "observations",
        header: "Observations",
        cell: (a) => <span className="tabular-nums">{a.observations}</span>,
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (a) => <ComplianceStatusBadge status={a.status} />,
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Audit management"
        description="Internal audit observations, statutory audit, and auditor details"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Audit" }]}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Statutory auditor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Firm</span>
            <p className="font-medium">{statutoryAuditorDetails.firm}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Partner</span>
            <p className="font-medium">{statutoryAuditorDetails.partner}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Membership no.</span>
            <p className="font-medium font-mono">{statutoryAuditorDetails.membershipNo}</p>
          </div>
        </CardContent>
      </Card>
      <CmsDataTable columns={columns} rows={mockAuditRecords} rowKey={(a) => a.id} />
    </PortalPageShell>
  );
}
