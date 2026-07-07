import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { Phone, Mail, Video, Search, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";
import { useListFollowUps, useCompleteFollowUp, type FollowUp as ApiFollowUp, type FollowUpStatus } from "@/api/sales";
import { toastApiError } from "@/lib/api-error";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { SalesPageHeader, SalesEmptyState } from "@/modules/sales/components";

type FilterTab = "all" | FollowUpStatus;

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

function FollowUpRow({
  fu,
  onComplete,
  completing,
}: {
  fu: ApiFollowUp;
  onComplete: (id: number) => void;
  completing: boolean;
}) {
  const Icon = typeIcons[fu.type] ?? Phone;
  const canComplete = fu.status === "scheduled" || fu.status === "overdue";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40",
        fu.status === "overdue" && "border-destructive/30 bg-destructive/[0.03]",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <Link href={`/sales/leads/${fu.leadId}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {fu.leadName ?? `Lead #${fu.leadId}`}
          </span>
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
      </Link>
      {canComplete ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1 text-xs"
          disabled={completing}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onComplete(fu.id);
          }}
        >
          {completing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Mark done
        </Button>
      ) : null}
    </div>
  );
}

export default function FollowUps() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [completingId, setCompletingId] = useState<number | null>(null);
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => { resetPage(); }, [search, filter, resetPage]);

  const listParams = {
    search: search.trim() || undefined,
    status: filter !== "all" ? filter : undefined,
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError, refetch } = useListFollowUps(listParams);
  const completeFollowUp = useCompleteFollowUp();

  const handleComplete = async (id: number) => {
    setCompletingId(id);
    try {
      await completeFollowUp.mutateAsync(id);
      toast.success("Follow-up marked as done");
    } catch (err) {
      toastApiError(err, "Failed to complete follow-up");
    } finally {
      setCompletingId(null);
    }
  };

  const followUps = data?.followUps ?? [];
  const totalCount = data?.total ?? 0;

  const sorted = useMemo(
    () => [...followUps].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [followUps],
  );

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
              {filter === tab.id ? ` (${totalCount})` : ""}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lead, company, or notes…"
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
      ) : sorted.length === 0 ? (
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
          {sorted.map((fu) => (
            <FollowUpRow
              key={fu.id}
              fu={fu}
              onComplete={handleComplete}
              completing={completingId === fu.id}
            />
          ))}
          <DataPagination
            page={page}
            total={totalCount}
            limit={limit}
            loadedRowCount={sorted.length}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      )}
    </PortalPageShell>
  );
}
