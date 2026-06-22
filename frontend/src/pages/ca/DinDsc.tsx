import { format } from "date-fns";
import { KeyRound } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockDinDscRecords, dinDscAlertThresholds } from "@/modules/ca/mock-data";
import { CAPageHeader, ComplianceStatusBadge } from "@/modules/ca/components";

export default function DinDsc() {
  return (
    <PortalPageShell>
      <CAPageHeader
        title="DIN / DSC management"
        description="Director compliance — DSC renewal alerts at 90, 60, and 30 days"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "DIN / DSC" }]}
      />
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {dinDscAlertThresholds.map((t) => (
          <span key={t} className="rounded-full border px-2 py-1 bg-muted/50">Alert at {t} days</span>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Director</TableHead>
              <TableHead className="text-xs">DIN</TableHead>
              <TableHead className="text-xs">DSC expiry</TableHead>
              <TableHead className="text-xs">Days to expiry</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockDinDscRecords.map((d) => (
              <TableRow key={d.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-medium">{d.directorName}</TableCell>
                <TableCell className="text-xs font-mono">{d.din}</TableCell>
                <TableCell className="text-xs">{format(new Date(d.dscExpiry), "MMM d, yyyy")}</TableCell>
                <TableCell className={`text-xs tabular-nums font-medium ${d.daysToExpiry <= 30 ? "text-red-600" : d.daysToExpiry <= 60 ? "text-amber-700" : ""}`}>
                  {d.daysToExpiry}d
                </TableCell>
                <TableCell><ComplianceStatusBadge status={d.dscStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
