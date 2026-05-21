import React, { useState, useMemo } from "react";
import { useListRequests, useUpdateRequest } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, MessageSquare, PlusCircle, Package, Clock, Zap, Inbox } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";

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
  const { data: allRequests, isLoading: statsLoading } = useListRequests({ limit: 500 });
  const updateMutation = useUpdateRequest();

  const requestStats = useMemo(() => {
    const requests = allRequests?.requests ?? [];
    return {
      total: allRequests?.total ?? requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [allRequests]);

  const addonRequests = useMemo(
    () => (data?.requests.filter((r) => (r as { type: string }).type === "add_on_work") || []) as RequestRow[],
    [data?.requests],
  );
  const resourceRequests = useMemo(
    () => (data?.requests.filter((r) => (r as { type: string }).type !== "add_on_work") || []) as RequestRow[],
    [data?.requests],
  );

  const tableData = activeSection === "addon" ? addonRequests : resourceRequests;

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Requests Management</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage resource and add-on work requests</p>
        </div>
      </div>

      {statsLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard title="Total requests" value={requestStats.total} hint="All submissions" icon={Inbox} accent="violet" delay={0} />
          <StatCard title="Pending" value={requestStats.pending} hint="Awaiting review" icon={Clock} accent="amber" alert={requestStats.pending > 0} delay={1} />
          <StatCard title="Approved" value={requestStats.approved} hint="Accepted requests" icon={Check} accent="green" delay={2} />
          <StatCard title="Rejected" value={requestStats.rejected} hint="Declined requests" icon={X} accent="red" delay={3} />
        </PageKpiRow>
      )}

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "resource" | "addon")}>
        <TabsList className="h-9 mb-4">
          <TabsTrigger value="addon" className="text-xs flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" /> Add-on Work Requests
            {addonRequests.filter((r) => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 ml-1">
                {addonRequests.filter((r) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resource" className="text-xs flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Resource Requests
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="bg-card">
        <div className="p-3 border-b border-border">
          <Tabs value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : (v as typeof status))}>
            <TabsList className="h-8">
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <AdvancedTable
              data={tableData}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Filter requests..."
              filename="RequestsExport"
              viewStorageKey={`admin-requests-${activeSection}`}
              showViewToggle
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
