import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useListProposals, type ProposalStatus } from "@/api/sales";
import { PROPOSAL_STATUS_LABELS, formatCurrency } from "@/modules/sales/constants";
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
  "seen",
  "revised",
  "approved",
  "declined",
  "counter_offer",
  "expired",
];

function calcTotal(items: { quantity: number; unitPrice: number; taxPercent: number }[], discount: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 + i.taxPercent / 100), 0);
  return subtotal * (1 - (discount ?? 0) / 100);
}

export default function Proposals() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");

  const { data, isLoading, isError, refetch } = useListProposals();
  const allProposals = data?.proposals ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allProposals.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.number.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || p.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [allProposals, search, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allProposals.length };
    for (const s of STATUS_ORDER) {
      if (s === "all") continue;
      counts[s] = allProposals.filter((p) => p.status === s).length;
    }
    return counts;
  }, [allProposals]);

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
              {s === "all" ? "All" : ((PROPOSAL_STATUS_LABELS as Record<string, string>)[s] ?? s)} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState
          icon={FileText}
          title="Failed to load proposals"
          description="Could not fetch proposals from the server."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <SalesEmptyState
          icon={FileText}
          title="No proposals found"
          description="Adjust filters or create a new proposal."
          actionLabel="Create proposal"
          onAction={() => navigate("/sales/proposals/create")}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Number</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">For</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Valid until</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const total = calcTotal(p.items, p.discount);
                  const forLabel = p.leadId
                    ? `Lead #${p.leadId}`
                    : p.customerId
                    ? `Customer #${p.customerId}`
                    : "—";
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
                      <TableCell className="text-xs max-w-[140px] truncate text-muted-foreground">
                        {forLabel}
                      </TableCell>
                      <TableCell>
                        <SalesStatusBadge variant="proposal" value={p.status} />
                      </TableCell>
                      <TableCell>
                        {p.assignedToUser ? (
                          <ExecutiveAvatar name={p.assignedToUser.name} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.validUntil ? format(new Date(p.validUntil), "MMM d, yyyy") : "—"}
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
