import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockNotices } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { LegalNotice } from "@/modules/legal/types";

export default function Notices() {
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockNotices.filter((n) => {
      const matchesSearch =
        !q ||
        n.reference.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.counterparty.toLowerCase().includes(q);
      const matchesDir = direction === "all" || n.direction === direction;
      return matchesSearch && matchesDir;
    });
  }, [search, direction]);

  const columns = useMemo<CmsColumn<LegalNotice>[]>(
    () => [
      { id: "reference", header: "Reference", cell: (n) => <span className="font-mono">{n.reference}</span> },
      {
        id: "direction",
        header: "Direction",
        chip: true,
        cell: (n) => (
          <Badge variant={n.direction === "incoming" ? "secondary" : "outline"} className="text-[10px] capitalize">
            {n.direction}
          </Badge>
        ),
      },
      { id: "subject", header: "Subject", cell: (n) => <span className="font-medium max-w-[200px] block truncate">{n.subject}</span> },
      { id: "counterparty", header: "Counterparty", cell: (n) => n.counterparty },
      { id: "status", header: "Status", chip: true, cell: (n) => <LegalStatusBadge variant="notice" value={n.status} /> },
      { id: "dueDate", header: "Due date", cell: (n) => format(new Date(n.dueDate), "MMM d, yyyy") },
      { id: "risk", header: "Risk", chip: true, cell: (n) => <LegalRiskBadge level={n.risk} /> },
      { id: "counsel", header: "Counsel", cell: (n) => <CounselAvatar name={n.assignedTo.name} /> },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Legal notices"
        description="Track incoming and outgoing legal notices, show-cause letters, and demand notices."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Notices" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Draft notice
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search notices…" />
      <CmsChipTabs
        value={direction}
        onValueChange={setDirection}
        items={[
          { value: "all", label: "All" },
          { value: "incoming", label: "Incoming" },
          { value: "outgoing", label: "Outgoing" },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(n) => n.id}
        empty={{ icon: Mail, title: "No notices found" }}
      />
    </PortalPageShell>
  );
}
