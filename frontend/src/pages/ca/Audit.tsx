import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockAuditRecords, statutoryAuditorDetails } from "@/modules/ca/mock-data";
import { AUDIT_PHASE_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, ComplianceStatusBadge } from "@/modules/ca/components";

export default function Audit() {
  return (
    <PortalPageShell>
      <CAPageHeader
        title="Audit management"
        description="Internal audit observations, statutory audit, and auditor details"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Audit" }]}
      />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Statutory auditor</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><span className="text-xs text-muted-foreground">Firm</span><p className="font-medium">{statutoryAuditorDetails.firm}</p></div>
          <div><span className="text-xs text-muted-foreground">Partner</span><p className="font-medium">{statutoryAuditorDetails.partner}</p></div>
          <div><span className="text-xs text-muted-foreground">Membership no.</span><p className="font-medium font-mono">{statutoryAuditorDetails.membershipNo}</p></div>
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Auditor</TableHead>
              <TableHead className="text-xs">Period</TableHead>
              <TableHead className="text-xs">Phase</TableHead>
              <TableHead className="text-xs">Observations</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAuditRecords.map((a) => (
              <TableRow key={a.id} className="hover:bg-muted/30">
                <TableCell className="text-xs capitalize font-medium">{a.type}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{a.auditor}</TableCell>
                <TableCell className="text-xs">{a.financialYear}</TableCell>
                <TableCell className="text-xs">{AUDIT_PHASE_LABELS[a.phase]}</TableCell>
                <TableCell className="text-xs tabular-nums">{a.observations}</TableCell>
                <TableCell><ComplianceStatusBadge status={a.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
