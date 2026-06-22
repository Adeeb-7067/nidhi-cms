import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockCourtCases } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

export default function CourtCases() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCourtCases.filter(
      (c) =>
        !q ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.court.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Court cases"
        description="Civil, labour, and commercial litigation — hearings and case status."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Court cases" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Register case
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search case numbers, courts…" />
      {filtered.length === 0 ? (
        <LegalEmptyState icon={Gavel} title="No court cases found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Case number</TableHead>
                <TableHead className="text-xs">Court</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Next hearing</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
                <TableHead className="text-xs">Filed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono font-medium">{c.caseNumber}</TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate">{c.court}</TableCell>
                  <TableCell className="text-xs">{c.title}</TableCell>
                  <TableCell><LegalStatusBadge variant="courtCase" value={c.status} /></TableCell>
                  <TableCell><LegalRiskBadge level={c.risk} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.nextHearing ? format(new Date(c.nextHearing), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell><CounselAvatar name={c.assignedTo.name} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.openedAt), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
