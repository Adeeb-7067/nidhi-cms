import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockClientMatters } from "@/modules/legal/mock-data";
import { formatCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

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
      {filtered.length === 0 ? (
        <LegalEmptyState icon={Building2} title="No client matters found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Matter</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs text-right">Contract value</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
                <TableHead className="text-xs">Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{m.clientName}</TableCell>
                  <TableCell className="text-xs">{m.matterTitle}</TableCell>
                  <TableCell><LegalStatusBadge variant="clientMatter" value={m.status} /></TableCell>
                  <TableCell><LegalRiskBadge level={m.risk} /></TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(m.contractValue)}</TableCell>
                  <TableCell><CounselAvatar name={m.assignedTo.name} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(m.openedAt), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
