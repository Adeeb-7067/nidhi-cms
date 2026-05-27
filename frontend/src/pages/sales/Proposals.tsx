import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockProposals, calcProposalTotal } from "@/modules/sales/mock-data";
import { PROPOSAL_STATUS_LABELS, formatCurrency } from "@/modules/sales/constants";
import type { ProposalStatus } from "@/modules/sales/types";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
} from "@/modules/sales/components";

const STATUS_ORDER: (ProposalStatus | "all")[] = [
  "all",
  "draft",
  "sent",
  "revised",
  "approved",
  "rejected",
  "expired",
];

export default function Proposals() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockProposals.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.number.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || p.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockProposals.length };
    for (const s of STATUS_ORDER) {
      if (s === "all") continue;
      counts[s] = mockProposals.filter((p) => p.status === s).length;
    }
    return counts;
  }, []);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Proposals"
        description="Create, send, and track client proposals."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Proposals" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/sales/proposals/create">
              <Plus className="h-3.5 w-3.5" />
              New proposal
            </Link>
          </Button>
        }
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search proposals…"
      />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_ORDER.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              className="text-xs data-[state=active]:bg-primary/10"
            >
              {s === "all" ? "All" : PROPOSAL_STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <SalesEmptyState
          icon={FileText}
          title="No proposals found"
          description="Adjust filters or create a new proposal."
          actionLabel="Create proposal"
          onAction={() => {}}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Number</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Valid until</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const { total } = calcProposalTotal(p);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Link
                          href={`/sales/proposals/${p.id}`}
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          {p.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[180px] truncate">
                        {p.title}
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">
                        {p.customerName}
                      </TableCell>
                      <TableCell>
                        <SalesStatusBadge variant="proposal" value={p.status} />
                      </TableCell>
                      <TableCell>
                        <ExecutiveAvatar name={p.assignedTo.name} />
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.validUntil), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
