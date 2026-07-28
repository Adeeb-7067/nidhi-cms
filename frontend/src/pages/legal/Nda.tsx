import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockNdaRecords } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { NdaRecord } from "@/modules/legal/types";

export default function NdaRepository() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockNdaRecords.filter((n) => {
      const matchesSearch = !q || n.partyName.toLowerCase().includes(q);
      const matchesTab = tab === "all" || n.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  const columns = useMemo<CmsColumn<NdaRecord>[]>(
    () => [
      { id: "party", header: "Party", cell: (n) => <span className="font-medium">{n.partyName}</span> },
      { id: "type", header: "Type", cell: (n) => <span className="capitalize">{n.partyType.replace("_", " ")}</span> },
      { id: "status", header: "Status", chip: true, cell: (n) => <LegalStatusBadge variant="nda" value={n.status} /> },
      { id: "signed", header: "Signed", cell: (n) => <span className="text-muted-foreground">{format(new Date(n.signedAt), "MMM d, yyyy")}</span> },
      { id: "expires", header: "Expires", cell: (n) => format(new Date(n.expiresAt), "MMM d, yyyy") },
      {
        id: "daysLeft",
        header: "Days left",
        cell: (n) => {
          const daysLeft = differenceInDays(new Date(n.expiresAt), new Date());
          return (
            <span className={`font-medium tabular-nums ${daysLeft < 30 ? "text-destructive" : ""}`}>
              {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
            </span>
          );
        },
      },
      { id: "risk", header: "Risk", chip: true, cell: (n) => <LegalRiskBadge level={n.risk} /> },
      { id: "counsel", header: "Counsel", cell: (n) => <CounselAvatar name={n.assignedTo.name} /> },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="NDA repository"
        description="Non-disclosure agreements with expiry tracking and renewal alerts."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "NDA repository" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add NDA
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search parties…" />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All" },
          { value: "expiring_soon", label: "Expiring soon" },
          { value: "expired", label: "Expired" },
          { value: "active", label: "Active" },
        ]}
      />
      <CmsDataTable columns={columns} rows={filtered} rowKey={(n) => n.id} empty={{ icon: FileWarning, title: "No NDAs found" }} />
    </PortalPageShell>
  );
}
