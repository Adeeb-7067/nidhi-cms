import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockAgreements } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

export default function Agreements() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockAgreements.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.counterparty.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Agreement management"
        description="MSAs, SLAs, employment contracts, and vendor agreements with renewal reminders."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Agreements" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New agreement
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search agreements…" />
      {filtered.length === 0 ? (
        <LegalEmptyState icon={FileText} title="No agreements found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Counterparty</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Effective</TableHead>
                <TableHead className="text-xs">Renewal</TableHead>
                <TableHead className="text-xs">Renewal in</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const daysToRenewal = differenceInDays(new Date(a.renewalDate), new Date());
                return (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{a.title}</TableCell>
                    <TableCell className="text-xs">{a.counterparty}</TableCell>
                    <TableCell className="text-xs uppercase">{a.type}</TableCell>
                    <TableCell><LegalStatusBadge variant="agreement" value={a.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(a.effectiveFrom), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-xs">{format(new Date(a.renewalDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className={`text-xs tabular-nums ${daysToRenewal < 60 ? "text-amber-600 font-medium" : ""}`}>
                      {daysToRenewal > 0 ? `${daysToRenewal}d` : "Overdue"}
                    </TableCell>
                    <TableCell><LegalRiskBadge level={a.risk} /></TableCell>
                    <TableCell><CounselAvatar name={a.assignedTo.name} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
