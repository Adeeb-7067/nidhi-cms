import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockNotices } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

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
      <Tabs value={direction} onValueChange={setDirection}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">All</TabsTrigger>
          <TabsTrigger value="incoming" className="text-xs data-[state=active]:bg-primary/10">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing" className="text-xs data-[state=active]:bg-primary/10">Outgoing</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <LegalEmptyState icon={Mail} title="No notices found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Direction</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">Counterparty</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => (
                <TableRow key={n.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono">{n.reference}</TableCell>
                  <TableCell>
                    <Badge variant={n.direction === "incoming" ? "secondary" : "outline"} className="text-[10px] capitalize">
                      {n.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{n.subject}</TableCell>
                  <TableCell className="text-xs">{n.counterparty}</TableCell>
                  <TableCell><LegalStatusBadge variant="notice" value={n.status} /></TableCell>
                  <TableCell className="text-xs">{format(new Date(n.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell><LegalRiskBadge level={n.risk} /></TableCell>
                  <TableCell><CounselAvatar name={n.assignedTo.name} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
