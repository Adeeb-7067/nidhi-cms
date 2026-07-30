import { useEffect, useMemo, useState } from "react";
import { useListRequests, useUpdateRequest, useRequestsSummary } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, MessageSquare, PlusCircle, Package, Clock, Inbox } from "lucide-react";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsRowActions } from "@/components/cms";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import { useQueryClient } from "@tanstack/react-query";

type RequestRow = {
  id: number;
  type: string;
  title: string;
  description?: string;
  adminNote?: string | null;
  urgency: string;
  status: string;
  developerName?: string;
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminRequests() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [activeSection, setActiveSection] = useState<"resource" | "addon">("addon");
  const listStatus = status === "all" ? undefined : status;
  const { data, isLoading, refetch } = useListRequests({ status: listStatus, limit: 100 });
  const { data: requestSummary, isLoading: statsLoading } = useRequestsSummary();
  const queryClient = useQueryClient();

  const requestStats = useMemo(
    () => ({
      total: requestSummary?.total ?? 0,
      pending: requestSummary?.pending ?? 0,
      approved: requestSummary?.approved ?? 0,
      rejected: requestSummary?.rejected ?? 0,
    }),
    [requestSummary],
  );
  const updateMutation = useUpdateRequest();

  const addonRequests = useMemo(
    () => (data?.requests.filter((r) => (r as { type: string }).type === "add_on_work") || []) as RequestRow[],
    [data?.requests],
  );
  const resourceRequests = useMemo(
    () => (data?.requests.filter((r) => (r as { type: string }).type !== "add_on_work") || []) as RequestRow[],
    [data?.requests],
  );

  const tableData = activeSection === "addon" ? addonRequests : resourceRequests;
  const { pagination: clientPagination, setPage: setClientPage } = useClientPagination(
    tableData,
    DEFAULT_TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    setClientPage(1);
  }, [status, activeSection, setClientPage]);

  const handleUpdateStatus = (id: number, newStatus: "approved" | "rejected") => {
    updateMutation.mutate(
      {
        id,
        data: { status: newStatus },
      },
      {
        onSuccess: () => {
          toast.success(`Request ${newStatus} successfully`);
          refetch();
          void queryClient.invalidateQueries({ queryKey: ["requests-summary"] });
          void queryClient.invalidateQueries({ queryKey: ["nav-badges"] });
        },
        onError: (err) => {
          toastApiError(err, "Failed to update request");
        },
      },
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "medium":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      default:
        return "";
    }
  };

  const columns: Column<RequestRow>[] = [
    {
      id: "developer",
      header: activeSection === "addon" ? "Submitted By" : "Developer",
      cell: (request) => (
        <span className="text-xs font-medium">{request.developerName}</span>
      ),
    },
    {
      id: "project",
      header: "Project",
      cell: (request) => (
        <span className="text-xs text-muted-foreground">{request.projectName}</span>
      ),
    },
    {
      id: "request",
      header: "Request",
      cell: (request) => (
        <div className="flex min-w-[160px] max-w-md flex-col">
          <span className="text-xs font-medium whitespace-normal">{request.title}</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {request.type.replace("_", " ").toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      detailOnly: true,
      detailCell: (request) => (
        <p className="whitespace-pre-wrap text-sm">{request.description?.trim() || "—"}</p>
      ),
    },
    {
      id: "adminNote",
      header: "Admin note",
      detailOnly: true,
      detailCell: (request) => (
        <p className="whitespace-pre-wrap text-sm">{request.adminNote?.trim() || "—"}</p>
      ),
    },
    {
      id: "createdAt",
      header: "Submitted",
      detailOnly: true,
      detailCell: (request) =>
        request.createdAt ? new Date(request.createdAt).toLocaleString() : "—",
    },
    {
      id: "urgency",
      header: "Urgency",
      cell: (request) => (
        <Badge
          variant="outline"
          className={`${getUrgencyColor(request.urgency)} h-4 px-1.5 py-0 text-[10px]`}
        >
          {request.urgency.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (request) => (
        <Badge
          variant="outline"
          className={`${
            request.status === "pending"
              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
              : request.status === "approved"
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
          } h-4 px-1.5 py-0 text-[10px]`}
        >
          {request.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      hideInDetail: true,
      cell: (request) =>
        request.status === "pending" ? (
          <CmsRowActions
            label="Request actions"
            items={[
              {
                label: "Approve",
                icon: Check,
                onSelect: () => handleUpdateStatus(request.id, "approved"),
                disabled: updateMutation.isPending,
              },
              {
                label: "Reject",
                icon: X,
                onSelect: () => handleUpdateStatus(request.id, "rejected"),
                disabled: updateMutation.isPending,
                variant: "destructive",
              },
            ]}
          />
        ) : (
          <CmsRowActions
            label="Request actions"
            items={[
              {
                label: "Details",
                icon: MessageSquare,
                onSelect: () => undefined,
              },
            ]}
          />
        ),
    },
  ];

  const addonPending = addonRequests.filter((r) => r.status === "pending").length;

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Requests Management"
        subtitle="Manage resource and add-on work requests"
      />

      <PortalKpiGrid
        loading={statsLoading}
        items={[
          { title: "Total requests", value: requestStats.total, hint: "All submissions", icon: Inbox, accent: "violet" },
          { title: "Pending", value: requestStats.pending, hint: "Awaiting review", icon: Clock, accent: "amber", alert: requestStats.pending > 0 },
          { title: "Approved", value: requestStats.approved, hint: "Accepted requests", icon: Check, accent: "green" },
          { title: "Rejected", value: requestStats.rejected, hint: "Declined requests", icon: X, accent: "red" },
        ]}
      />

      <CmsChipTabs
        value={activeSection}
        onValueChange={(v) => setActiveSection(v as "resource" | "addon")}
        items={[
          {
            value: "addon",
            label: "Add-on work",
            count: addonPending > 0 ? addonPending : undefined,
          },
          { value: "resource", label: "Resource requests" },
        ]}
      />

      <CmsChipTabs
        value={status}
        onValueChange={(v) => setStatus(v as typeof status)}
        items={[
          { value: "pending", label: "Pending", count: requestStats.pending },
          { value: "approved", label: "Approved", count: requestStats.approved },
          { value: "rejected", label: "Rejected", count: requestStats.rejected },
          { value: "all", label: "All", count: requestStats.total },
        ]}
      />

      {isLoading ? (
        <div className="rounded-md border border-border/60 py-16 text-center text-xs text-muted-foreground">
          Loading requests…
        </div>
      ) : (
        <AdvancedTable
          data={tableData}
          columns={columns}
          searchKey="title"
          searchPlaceholder="Filter requests…"
          filename="RequestsExport"
          viewStorageKey={`admin-requests-${activeSection}`}
          showViewToggle
          clientPagination={clientPagination}
        />
      )}
    </PortalPageShell>
  );
}
