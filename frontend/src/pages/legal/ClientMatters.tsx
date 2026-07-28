import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockClientMatters } from "@/modules/legal/mock-data";
import { formatCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { ClientMatter } from "@/modules/legal/types";

export default function ClientMattersPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockClientMatters.filter(
      (m) =>
        !q ||
        m.clientName.toLowerCase().includes(q) ||
        m.matterTitle.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<ClientMatter>[]>(
    () => [
      { id: "client", header: "Client", cell: (m) => <span className="font-medium">{m.clientName}</span> },
      { id: "matter", header: "Matter", cell: (m) => m.matterTitle },
      { id: "status", header: "Status", chip: true, cell: (m) => <LegalStatusBadge variant="clientMatter" value={m.status} /> },
      { id: "risk", header: "Risk", chip: true, cell: (m) => <LegalRiskBadge level={m.risk} /> },
      { id: "contractValue", header: "Contract value", align: "right", cell: (m) => <span className="font-medium tabular-nums">{formatCurrency(m.contractValue)}</span> },
      { id: "counsel", header: "Counsel", cell: (m) => <CounselAvatar name={m.assignedTo.name} /> },
      { id: "opened", header: "Opened", cell: (m) => <span className="text-muted-foreground">{format(new Date(m.openedAt), "MMM d, yyyy")}</span> },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Client legal matters"
        description="Contract disputes, IP issues, and client-facing legal work."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Client matters" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New matter
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search clients, matters…" />
      <CmsDataTable columns={columns} rows={filtered} rowKey={(m) => m.id} empty={{ icon: Building2, title: "No client matters found" }} />
    </PortalPageShell>
  );
}
