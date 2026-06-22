import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockNdaRecords } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

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
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">All</TabsTrigger>
          <TabsTrigger value="expiring_soon" className="text-xs data-[state=active]:bg-primary/10">Expiring soon</TabsTrigger>
          <TabsTrigger value="expired" className="text-xs data-[state=active]:bg-primary/10">Expired</TabsTrigger>
          <TabsTrigger value="active" className="text-xs data-[state=active]:bg-primary/10">Active</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <LegalEmptyState icon={FileWarning} title="No NDAs found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Party</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Signed</TableHead>
                <TableHead className="text-xs">Expires</TableHead>
                <TableHead className="text-xs">Days left</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => {
                const daysLeft = differenceInDays(new Date(n.expiresAt), new Date());
                return (
                  <TableRow key={n.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{n.partyName}</TableCell>
                    <TableCell className="text-xs capitalize">{n.partyType.replace("_", " ")}</TableCell>
                    <TableCell><LegalStatusBadge variant="nda" value={n.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(n.signedAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-xs">{format(new Date(n.expiresAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className={`text-xs font-medium tabular-nums ${daysLeft < 30 ? "text-destructive" : ""}`}>
                      {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
                    </TableCell>
                    <TableCell><LegalRiskBadge level={n.risk} /></TableCell>
                    <TableCell><CounselAvatar name={n.assignedTo.name} /></TableCell>
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
