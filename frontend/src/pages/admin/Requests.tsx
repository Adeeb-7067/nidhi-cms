import React, { useEffect, useState, useMemo } from "react";
import { useListRequests, useUpdateRequest, getListRequestsQueryKey } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTableSkeleton } from "@/components/loading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, MessageSquare, PlusCircle, Package, Clock, Inbox } from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  PortalTabsList,
  PortalTabsTrigger,
  PortalContentCard,
} from "@/components/layout/portal-page-kit";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import { QUERY_STALE } from "@/lib/query-config";
import { LIST_COUNT_PARAMS, selectListTotal } from "@/hooks/use-list-totals";

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
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | undefined>("pending");
  const [activeSection, setActiveSection] = useState<"resource" | "addon">("addon");
  const { data, isLoading, refetch } = useListRequests({ status, limit: 100 });
  const countQueryBase = { staleTime: QUERY_STALE.reference, select: selectListTotal };
  const { data: requestTotal = 0, isLoading: totalLoading } = useListRequests(LIST_COUNT_PARAMS, {
    query: { ...countQueryBase, queryKey: getListRequestsQueryKey(LIST_COUNT_PARAMS) },
  });
  const { data: pendingTotal = 0, isLoading: pendingLoading } = useListRequests(
    { ...LIST_COUNT_PARAMS, status: "pending" },
    {
      query: {
        ...countQueryBase,
        queryKey: getListRequestsQueryKey({ ...LIST_COUNT_PARAMS, status: "pending" }),
      },
    },
  );
  const { data: approvedTotal = 0, isLoading: approvedLoading } = useListRequests(
    { ...LIST_COUNT_PARAMS, status: "approved" },
    {
      query: {
        ...countQueryBase,
        queryKey: getListRequestsQueryKey({ ...LIST_COUNT_PARAMS, status: "approved" }),
      },
    },
  );
  const { data: rejectedTotal = 0, isLoading: rejectedLoading } = useListRequests(
    { ...LIST_COUNT_PARAMS, status: "rejected" },
    {
      query: {
        ...countQueryBase,
        queryKey: getListRequestsQueryKey({ ...LIST_COUNT_PARAMS, status: "rejected" }),
      },
    },
  );
  const updateMutation = useUpdateRequest();

  const requestStats = useMemo(
    () => ({
      total: requestTotal,
      pending: pendingTotal,
      approved: approvedTotal,
      rejected: rejectedTotal,
    }),
    [requestTotal, pendingTotal, approvedTotal, rejectedTotal],
  );
  const statsLoading = totalLoading || pendingLoading || approvedLoading || rejectedLoading;

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
        <span className="font-medium text-xs">{request.developerName}</span>
      ),
    },
    {
      id: "project",
      header: "Project",
      cell: (request) => (
        <span className="text-muted-foreground text-xs">{request.projectName}</span>
      ),
    },
    {
      id: "request",
      header: "Request",
      cell: (request) => (
        <div className="flex flex-col min-w-[160px] max-w-md">
          <span className="font-medium text-xs whitespace-normal">{request.title}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
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
          className={`${getUrgencyColor(request.urgency)} text-[10px] px-1.5 py-0 h-4`}
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
          } text-[10px] px-1.5 py-0 h-4`}
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
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600 border-green-500/20"
              onClick={() => handleUpdateStatus(request.id, "approved")}
              disabled={updateMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border-red-500/20"
              onClick={() => handleUpdateStatus(request.id, "rejected")}
              disabled={updateMutation.isPending}
            >
              <X className="h-3 w-3 mr-1" /> Reject
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            <MessageSquare className="h-3 w-3 mr-1" /> Details
          </Button>
        ),
    },
  ];

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

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "resource" | "addon")}>
        <PortalTabsList className="mb-4">
          <PortalTabsTrigger value="addon" className="flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" /> Add-on Work Requests
            {addonRequests.filter((r) => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 ml-1">
                {addonRequests.filter((r) => r.status === "pending").length}
              </Badge>
            )}
          </PortalTabsTrigger>
          <PortalTabsTrigger value="resource" className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Resource Requests
          </PortalTabsTrigger>
        </PortalTabsList>
      </Tabs>

      <PortalContentCard contentClassName="p-0">
        <div className="p-3 border-b border-border">
          <Tabs value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : (v as typeof status))}>
            <PortalTabsList>
              <PortalTabsTrigger value="pending">Pending</PortalTabsTrigger>
              <PortalTabsTrigger value="approved">Approved</PortalTabsTrigger>
              <PortalTabsTrigger value="rejected">Rejected</PortalTabsTrigger>
              <PortalTabsTrigger value="all">All</PortalTabsTrigger>
            </PortalTabsList>
          </Tabs>
        </div>
        <div className="p-4">
          {isLoading ? (
            <PageTableSkeleton rows={8} columns={6} showToolbar />
          ) : (
            <AdvancedTable
              data={tableData}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Filter requests..."
              filename="RequestsExport"
              viewStorageKey={`admin-requests-${activeSection}`}
              showViewToggle
              clientPagination={clientPagination}
            />
          )}
        </div>
      </PortalContentCard>
    </PortalPageShell>
  );
}
