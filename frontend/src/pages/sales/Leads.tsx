import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus, Users, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { useListLeads } from "@/api/sales";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  LEAD_SOURCE_LABELS,
  formatCompactCurrency,
} from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
  LeadFormDrawer,
  BulkLeadActions,
} from "@/modules/sales/components";

export default function SalesLeads() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useListLeads({ search: search || undefined });
  const allLeads = data?.leads ?? [];

  const filtered = useMemo(() => {
    if (statusTab === "all") return allLeads;
    return allLeads.filter((l) => l.status === statusTab);
  }, [allLeads, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allLeads.length };
    for (const s of LEAD_STATUS_ORDER) {
      counts[s] = allLeads.filter((l) => l.status === s).length;
    }
    return counts;
  }, [allLeads]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Lead management"
        description="View, assign, and manage all leads across sources."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Lead management" },
        ]}
        actions={
          <>
            <Button size="sm" variant="outline" className="h-8 gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add lead
            </Button>
          </>
        }
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, company, email…"
      />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">
            All ({statusCounts.all})
          </TabsTrigger>
          {LEAD_STATUS_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary/10">
              {LEAD_STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {selected.size > 0 && (
        <motion.div
          className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-medium">{selected.size} selected</span>
          <BulkLeadActions
            selectedIds={[...selected]}
            onClear={() => setSelected(new Set())}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SalesEmptyState
          icon={Users}
          title="Failed to load leads"
          description="Could not fetch leads from the server."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <SalesEmptyState
          icon={Users}
          title="No leads found"
          description="Try adjusting your search or status filter, or add a new lead."
          actionLabel="Add lead"
          onAction={() => setDrawerOpen(true)}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs text-right">Expected value</TableHead>
                  <TableHead className="text-xs">Next reminder</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      "hover:bg-muted/30",
                      selected.has(lead.id) && "bg-primary/[0.03]",
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onCheckedChange={() => toggleOne(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      #{lead.id}
                    </TableCell>
                    <TableCell>
                      <Link href={`/sales/leads/${lead.id}`} className="block min-w-0 hover:text-primary">
                        <p className="text-xs font-medium">{lead.name}</p>
                        <p className="text-[10px] text-muted-foreground">{lead.email ?? "—"}</p>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">{lead.company ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {lead.source ? (LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] ?? lead.source) : "—"}
                    </TableCell>
                    <TableCell>
                      <SalesStatusBadge variant="lead" value={lead.status} />
                    </TableCell>
                    <TableCell>
                      <SalesStatusBadge variant="priority" value={lead.priority} />
                    </TableCell>
                    <TableCell>
                      {lead.assignedToUser ? (
                        <ExecutiveAvatar name={lead.assignedToUser.name} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">
                      {formatCompactCurrency(lead.expectedValue)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.reminder?.date
                        ? format(new Date(lead.reminder.date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <LeadFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </PortalPageShell>
  );
}
