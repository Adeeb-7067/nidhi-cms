import React, { useState, useMemo } from "react";
import { useListRequests, useCreateRequest, useListProjects } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Inbox, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
  DevContentCard,
  DevEmptyState,
  devActionButtonClass,
} from "@/components/dev/dev-page-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { useTablePagination } from "@/lib/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const requestSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  type: z.enum(["software_license", "hardware", "api_access", "server_hosting", "design_asset", "other"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  urgency: z.enum(["low", "medium", "high"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function DevRequests() {
  const [open, setOpen] = useState(false);
  const { page, setPage, limit, apiLimit, setLimit } = useTablePagination();
  const { data, isLoading, refetch } = useListRequests({ page, limit: apiLimit });
  const { data: projectsData } = useListProjects({ limit: 50 });
  const createRequest = useCreateRequest();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      projectId: "",
      type: "software_license",
      title: "",
      description: "",
      urgency: "medium",
    },
  });

  const requestStats = useMemo(() => {
    const requests = data?.requests ?? [];
    return {
      total: data?.total ?? requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [data]);

  const onSubmit = async (values: RequestFormValues) => {
    try {
      await createRequest.mutateAsync({
        data: {
          ...values,
          projectId: parseInt(values.projectId),
        },
      });
      toast.success("Request submitted");
      setOpen(false);
      form.reset();
      refetch();
    } catch (error: any) {
      toastApiError(error, "Action failed. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-blue-500 border-blue-500/50 bg-blue-500/10 text-[10px]">PENDING</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-[10px]">APPROVED</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10 text-[10px]">REJECTED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status.toUpperCase()}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10 text-[10px]">HIGH</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 text-[10px]">MEDIUM</Badge>;
      case "low":
        return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-[10px]">LOW</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{urgency.toUpperCase()}</Badge>;
    }
  };

  type RequestRow = NonNullable<typeof data>["requests"][number];

  const columns: Column<RequestRow>[] = [
    {
      id: "type",
      header: "Type",
      cell: (request) => (
        <span className="capitalize text-xs">{request.type.replace("_", " ")}</span>
      ),
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      cell: (request) => <span className="font-medium text-xs">{request.title}</span>,
    },
    {
      id: "project",
      header: "Project",
      cell: (request) => (
        <span className="text-muted-foreground text-xs">{request.projectName}</span>
      ),
    },
    {
      id: "urgency",
      header: "Urgency",
      cell: (request) => getUrgencyBadge(request.urgency),
    },
    {
      id: "status",
      header: "Status",
      cell: (request) => getStatusBadge(request.status),
    },
    {
      id: "date",
      header: "Date",
      cell: (request) => (
        <span className="text-muted-foreground text-xs">
          {new Date(request.createdAt).toLocaleDateString()}
        </span>
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
      header: "Admin response",
      detailOnly: true,
      detailCell: (request) => (
        <p className="whitespace-pre-wrap text-sm">{request.adminNote?.trim() || "—"}</p>
      ),
    },
    {
      id: "updatedAt",
      header: "Last updated",
      detailOnly: true,
      detailCell: (request) => new Date(request.updatedAt).toLocaleString(),
    },
  ];

  return (
    <DevPageShell>
      <DevPageHero
        title="Resource Requests"
        subtitle="Request tools, hardware, or access"
        actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className={devActionButtonClass()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Resource Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectsData?.projects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="software_license">Software License</SelectItem>
                            <SelectItem value="hardware">Hardware</SelectItem>
                            <SelectItem value="api_access">API Access</SelectItem>
                            <SelectItem value="server_hosting">Server Hosting</SelectItem>
                            <SelectItem value="design_asset">Design Asset</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Adobe XD License" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why you need this resource..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createRequest.isPending}>
                    {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      <DevKpiGrid
        loading={isLoading && !data}
        items={[
          { title: "My requests", value: requestStats.total, hint: "All submissions", icon: Inbox, accent: "violet" },
          { title: "Pending", value: requestStats.pending, hint: "Awaiting review", icon: Clock, accent: "amber", alert: requestStats.pending > 0 },
          { title: "Approved", value: requestStats.approved, hint: "Accepted", icon: CheckCircle2, accent: "green" },
          { title: "Rejected", value: requestStats.rejected, hint: "Declined", icon: XCircle, accent: "red" },
        ]}
      />

      {isLoading ? (
        <DevContentCard>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </DevContentCard>
      ) : !data?.requests?.length ? (
        <DevEmptyState
          icon={Inbox}
          title="No resource requests found"
          description="Submit a new request when you need tools, hardware, or access."
        />
      ) : (
        <DevContentCard>
            <AdvancedTable
              data={data.requests}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Search requests..."
              filename="DevRequestsExport"
              viewStorageKey="dev-requests"
              pagination={{
                page: data.page ?? page,
                total: data.total ?? 0,
                limit,
                onPageChange: setPage,
                onLimitChange: setLimit,
              }}
            />
        </DevContentCard>
      )}
    </DevPageShell>
  );
}
