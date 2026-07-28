import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { Phone, Mail, Video, Check, Loader2, CalendarClock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { useTablePagination } from "@/lib/table-pagination";
import {
  useListFollowUps,
  useCompleteFollowUp,
  type FollowUp as ApiFollowUp,
  type FollowUpStatus,
} from "@/api/sales";
import { toastApiError } from "@/lib/api-error";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { SalesPageHeader, SalesFilterBar } from "@/modules/sales/components";

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

export default function FollowUps() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [completingId, setCompletingId] = useState<number | null>(null);
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => {
    resetPage();
  }, [search, filter, resetPage]);

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
    () =>
      [...followUps].sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      ),
    [followUps],
  );

  const overdueCount = useMemo(
    () => sorted.filter((f) => f.status === "overdue").length,
    [sorted],
  );
  const upcomingCount = useMemo(
    () => sorted.filter((f) => f.status === "scheduled").length,
    [sorted],
  );
  const doneCount = useMemo(
    () => sorted.filter((f) => f.status === "completed").length,
    [sorted],
  );

  const columns: CmsColumn<ApiFollowUp>[] = [
    {
      id: "type",
      header: "Type",
      cell: (fu) => {
        const Icon = typeIcons[fu.type] ?? Phone;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="capitalize text-xs">{fu.type}</span>
          </div>
        );
      },
    },
    {
      id: "lead",
      header: "Lead",
      cell: (fu) => (
        <Link href={`/sales/leads/${fu.leadId}`} className="font-medium hover:text-primary">
          {fu.leadName ?? `Lead #${fu.leadId}`}
        </Link>
      ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (fu) => (
        <Badge variant="outline" className="h-5 text-[10px] capitalize">
          {statusLabel[fu.status] ?? fu.status}
        </Badge>
      ),
    },
    {
      id: "scheduled",
      header: "Scheduled",
      cell: (fu) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(fu.scheduledAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      className: "max-w-[220px] truncate",
      cell: (fu) => <span className="text-muted-foreground">{fu.notes || "—"}</span>,
    },
    {
      id: "created",
      header: "Created",
      cell: (fu) => (
        <span className="text-muted-foreground whitespace-nowrap text-[11px]">
          {formatSalesDateTime(fu.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      hideable: false,
      cell: (fu) => {
        const canComplete = fu.status === "scheduled" || fu.status === "overdue";
        if (!canComplete) return null;
        const completing = completingId === fu.id;
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={completing}
            onClick={() => void handleComplete(fu.id)}
          >
            {completing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Mark done
          </Button>
        );
      },
    },
  ];

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

      <PortalKpiGrid
        items={[
          {
            title: "In this view",
            value: totalCount,
            icon: CalendarClock,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Overdue",
            value: filter === "overdue" ? totalCount : overdueCount,
            icon: AlertCircle,
            accent: "red",
            alert: (filter === "overdue" ? totalCount : overdueCount) > 0,
            delay: 1,
          },
          {
            title: "Upcoming",
            value: filter === "scheduled" ? totalCount : upcomingCount,
            icon: Phone,
            accent: "amber",
            delay: 2,
          },
          {
            title: "Done",
            value: filter === "completed" ? totalCount : doneCount,
            icon: CheckCircle2,
            accent: "green",
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by lead, company, or notes…"
      />

      <CmsChipTabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterTab)}
        items={FILTER_TABS.map((tab) => ({
          value: tab.id,
          label: tab.label,
          count: filter === tab.id ? totalCount : undefined,
        }))}
      />

      <CmsDataTable
        columns={columns}
        rows={sorted}
        rowKey={(fu) => fu.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: CalendarClock,
          title: "No follow-ups",
          description: search.trim()
            ? "No follow-ups match your search."
            : "Schedule a follow-up from any lead page.",
        }}
        pagination={{
          page,
          total: totalCount,
          limit,
          loadedRowCount: sorted.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />
    </PortalPageShell>
  );
}
