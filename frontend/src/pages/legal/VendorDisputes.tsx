import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockVendorDisputes } from "@/modules/legal/mock-data";
import { formatCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

export default function VendorDisputes() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockVendorDisputes.filter(
      (d) =>
        !q ||
        d.vendorName.toLowerCase().includes(q) ||
        d.contractRef.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Vendor disputes"
        description="Contract disagreements, SLA breaches, and vendor litigation."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Vendor disputes" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Log dispute
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors, contracts…" />
      {filtered.length === 0 ? (
        <LegalEmptyState icon={Handshake} title="No disputes found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">Contract</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs text-right">Amount in dispute</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
                <TableHead className="text-xs">Opened</TableHead>
                <TableHead className="text-xs">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{d.vendorName}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{d.contractRef}</TableCell>
                  <TableCell><LegalStatusBadge variant="vendorDispute" value={d.status} /></TableCell>
                  <TableCell><LegalRiskBadge level={d.risk} /></TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(d.amountInDispute)}</TableCell>
                  <TableCell><CounselAvatar name={d.assignedTo.name} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(d.openedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{d.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
