import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Phone, Mail, Video, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { useListFollowUps, type FollowUp as ApiFollowUp } from "@/api/sales";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { SalesPageHeader, SalesEmptyState } from "@/modules/sales/components";

type FilterTab = "all" | "overdue" | "scheduled" | "completed";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "scheduled", label: "Upcoming" },
  { id: "completed", label: "Done" },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  demo: Video,
};

const statusLabel: Record<string, string> = {
  overdue: "Overdue",
  scheduled: "Upcoming",
  completed: "Done",
  cancelled: "Cancelled",
};

function FollowUpRow({ fu }: { fu: ApiFollowUp }) {
  const Icon = typeIcons[fu.type] ?? Phone;
  return (
    <Link href={`/sales/leads/${fu.leadId}`}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40",
          fu.status === "overdue" && "border-destructive/30 bg-destructive/[0.03]",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Lead #{fu.leadId}</span>
            <Badge variant="outline" className="h-5 text-[10px] capitalize">
              {statusLabel[fu.status] ?? fu.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="capitalize">{fu.type}</span>
            {" · "}
            {format(new Date(fu.scheduledAt), "MMM d, yyyy")}
            {fu.notes ? ` · ${fu.notes}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            Created {formatSalesDateTime(fu.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function FollowUps() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data, isLoading, isError, refetch } = useListFollowUps({ limit: 500 });
  const allFollowUps = data?.followUps ?? [];

  const counts = useMemo(
    () => ({
      all: allFollowUps.length,
      overdue: allFollowUps.filter((f) => f.status === "overdue").length,
      scheduled: allFollowUps.filter((f) => f.status === "scheduled").length,
      completed: allFollowUps.filter((f) => f.status === "completed").length,
    }),
    [allFollowUps],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFollowUps
      .filter((f) => filter === "all" || f.status === filter)
      .filter(
        (f) =>
          !q ||
          (f.notes?.toLowerCase().includes(q) ?? false) ||
          String(f.leadId).includes(q) ||
          f.type.toLowerCase().includes(q),
      )
      .sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );
  }, [allFollowUps, filter, search]);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Follow-ups"
        description="Scheduled calls, emails, and meetings for your leads."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Follow-ups" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                filter === tab.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50",
              )}
            >
              {tab.label}
              {counts[tab.id] > 0 ? ` (${counts[tab.id]})` : ""}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SalesEmptyState
          title="Failed to load follow-ups"
          description="Could not fetch follow-ups from the server."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <SalesEmptyState
          title="No follow-ups"
          description={
            search.trim()
              ? "No follow-ups match your search."
              : "Schedule a follow-up from any lead page."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((fu) => (
            <FollowUpRow key={fu.id} fu={fu} />
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
