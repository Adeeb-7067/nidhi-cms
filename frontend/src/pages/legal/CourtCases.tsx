import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockCourtCases } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { CourtCase } from "@/modules/legal/types";

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

  const columns = useMemo<CmsColumn<CourtCase>[]>(
    () => [
      { id: "caseNumber", header: "Case number", cell: (c) => <span className="font-mono font-medium">{c.caseNumber}</span> },
      { id: "court", header: "Court", cell: (c) => <span className="max-w-[140px] block truncate">{c.court}</span> },
      { id: "title", header: "Title", cell: (c) => c.title },
      { id: "status", header: "Status", chip: true, cell: (c) => <LegalStatusBadge variant="courtCase" value={c.status} /> },
      { id: "risk", header: "Risk", chip: true, cell: (c) => <LegalRiskBadge level={c.risk} /> },
      { id: "nextHearing", header: "Next hearing", cell: (c) => <span className="text-muted-foreground">{c.nextHearing ? format(new Date(c.nextHearing), "MMM d, yyyy") : "—"}</span> },
      { id: "counsel", header: "Counsel", cell: (c) => <CounselAvatar name={c.assignedTo.name} /> },
      { id: "filed", header: "Filed", cell: (c) => <span className="text-muted-foreground">{format(new Date(c.openedAt), "MMM d, yyyy")}</span> },
    ],
    [],
  );

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
      <CmsDataTable columns={columns} rows={filtered} rowKey={(c) => c.id} empty={{ icon: Gavel, title: "No court cases found" }} />
    </PortalPageShell>
  );
}
