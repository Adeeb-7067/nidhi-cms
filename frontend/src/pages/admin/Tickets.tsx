import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListTickets,
  useCreateTicket,
  getListTicketsQueryKey,
  useListProjects,
  useListUsers,
  getListProjectsQueryKey,
  getListUsersQueryKey,
  useTicketsSummary,
  type Ticket,
  type TicketAudience,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ticket as TicketIcon,
} from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { cn } from "@/lib/utils";
import { CmsChipTabs, CmsDataTable, CmsFilterBar, type CmsColumn } from "@/components/cms";
import { useQueryClient } from "@tanstack/react-query";
import { listQueryOptions } from "@/lib/list-query-options";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useTablePagination } from "@/lib/table-pagination";
import { TicketDetailSheet } from "@/components/tickets/ticket-detail-sheet";
import { formatUserRole } from "@/lib/bug-workflow";
import { isDevPortalRole } from "@/lib/navigation";
import { clearUrlSearchParam, readTicketIdFromUrl } from "@/lib/notification-navigation";

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  projectId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assignedTo: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;
type AdminAudienceTab = "all" | TicketAudience;

function statusIcon(status: string) {
  switch (status) {
    case "open":
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "resolved":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "closed":
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-500/10 text-red-500";
    case "high":
      return "bg-orange-500/10 text-orange-500";
    case "medium":
      return "bg-amber-500/10 text-amber-500";
    case "low":
      return "bg-green-500/10 text-green-500";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export default function AdminTickets() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isAdmin = role === "super_admin";
  const isStaffUser = isDevPortalRole(role);

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [audienceTab, setAudienceTab] = useState<AdminAudienceTab>("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [location] = useLocation();
  const ticketIdFromUrl = readTicketIdFromUrl();
  const [pendingTicketId, setPendingTicketId] = useState<number | null>(null);
  const deepLinkErrorShownRef = useRef<number | null>(null);

  const listParams = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(isAdmin && audienceTab !== "all" ? { audience: audienceTab } : {}),
      page,
      limit: apiLimit,
    }),
    [search, statusFilter, audienceTab, isAdmin, page, apiLimit],
  );

  const listQueryKey = getListTicketsQueryKey(listParams);

  const { data, isLoading, isError, refetch, isFetching } = useListTickets(listParams, {
    query: listQueryOptions({ queryKey: listQueryKey }),
  });

  const summaryAudience =
    isAdmin && audienceTab !== "all" ? (audienceTab as TicketAudience) : undefined;
  const {
    data: ticketSummary,
    isLoading: statsLoading,
  } = useTicketsSummary(summaryAudience ?? "all");

  const ticketStats = useMemo(
    () => ({
      total: ticketSummary?.total ?? 0,
      open: ticketSummary?.open ?? 0,
      pending: ticketSummary?.pending ?? 0,
      urgent: (ticketSummary?.urgent ?? 0) + (ticketSummary?.high ?? 0),
    }),
    [ticketSummary],
  );

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, audienceTab, resetPage]);

  const projectsParams = { limit: 100 };
  const { data: projectsData } = useListProjects(projectsParams, {
    query: {
      queryKey: getListProjectsQueryKey(projectsParams),
      enabled: isCreateOpen && (isAdmin || role === "client"),
    },
  });
  const devUsersParams = { role: "developer" as const, limit: 100 };
  const freelancerUsersParams = { role: "freelancer" as const, limit: 100 };
  const { data: devUsersData } = useListUsers(devUsersParams, {
    query: {
      queryKey: getListUsersQueryKey(devUsersParams),
      enabled: isCreateOpen && isAdmin,
    },
  });
  const { data: freelancerUsersData } = useListUsers(freelancerUsersParams, {
    query: {
      queryKey: getListUsersQueryKey(freelancerUsersParams),
      enabled: isCreateOpen && isAdmin,
    },
  });
  const assignableUsers = useMemo(() => {
    const merged = [...(devUsersData?.users ?? []), ...(freelancerUsersData?.users ?? [])];
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [devUsersData, freelancerUsersData]);

  const createMutation = useCreateTicket();

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSheetOpen(true);
  };

  // Pick up ?ticket= when landing or when notification navigation updates the query string.
  useEffect(() => {
    if (ticketIdFromUrl != null) {
      deepLinkErrorShownRef.current = null;
      setPendingTicketId(ticketIdFromUrl);
    }
  }, [location, ticketIdFromUrl]);

  useEffect(() => {
    if (!pendingTicketId) return;

    const pool = data?.tickets ?? [];
    const found = pool.find((t) => t.id === pendingTicketId);
    if (found) {
      setSelectedTicket(found);
      setSheetOpen(true);
      setPendingTicketId(null);
      clearUrlSearchParam("ticket");
      return;
    }

    if (!isLoading && !isFetching && deepLinkErrorShownRef.current !== pendingTicketId) {
      deepLinkErrorShownRef.current = pendingTicketId;
      toast.error("Ticket not found or you do not have access.");
      setPendingTicketId(null);
      clearUrlSearchParam("ticket");
    }
  }, [pendingTicketId, data?.tickets, isLoading, isFetching]);

  const onSubmit = async (values: TicketFormValues) => {
    try {
      await createMutation.mutateAsync({
        data: {
          ...values,
          projectId: values.projectId ? parseInt(values.projectId, 10) : undefined,
          assignedTo: values.assignedTo ? parseInt(values.assignedTo, 10) : undefined,
        },
      });
      toast.success("Ticket created");
      setIsCreateOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["tickets-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["nav-badges"] });
    } catch (err) {
      toastApiError(err, "Failed to create ticket");
    }
  };

  const creatorLabel = (ticket: Ticket) => {
    if (!isAdmin && user?.id === ticket.creatorId) return "You";
    const role = ticket.creatorRole ? formatUserRole(ticket.creatorRole) : null;
    if (ticket.creatorName && role) return `${ticket.creatorName} (${role})`;
    return ticket.creatorName ?? "—";
  };

  const pageTitle = isAdmin
    ? "Support tickets"
    : role === "client"
      ? "My support tickets"
      : "My raised tickets";

  const pageSubtitle = isAdmin
    ? "View and resolve all client and internal requests"
    : isStaffUser
      ? "Tickets you have raised appear here — chat with support until resolved"
      : "Raise issues and chat with support until resolved";

  const ticketColumns: CmsColumn<Ticket>[] = [
    {
      id: "title",
      header: "Title",
      className: "font-medium whitespace-normal max-w-[280px]",
      cell: (ticket) => (
        <span className="flex items-center gap-2">
          {statusIcon(ticket.status)}
          {ticket.title}
        </span>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      chip: true,
      cell: (ticket) => (
        <Badge className={priorityClass(ticket.priority)} variant="secondary">
          {ticket.priority}
        </Badge>
      ),
    },
    {
      id: "raisedBy",
      header: "Raised by",
      cell: (ticket) => <span className="text-muted-foreground">{creatorLabel(ticket)}</span>,
    },
    {
      id: "project",
      header: "Project",
      cell: (ticket) => <span className="text-muted-foreground">{ticket.projectName || "—"}</span>,
    },
    {
      id: "created",
      header: "Created",
      cell: (ticket) => (
        <span className="text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "right",
      cell: (ticket) => (
        <span className="capitalize">{ticket.status === "pending" ? "In progress" : ticket.status}</span>
      ),
    },
  ];

  return (
    <PortalPageShell>
      <PortalPageHero
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className={portalActionButtonClass()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create ticket</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief summary…" {...field} />
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
                        <Textarea placeholder="What do you need help with?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className={cn("grid gap-4", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
                  {(isAdmin || role === "client") && (
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project (optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectsData?.projects.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to (optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Developer / Freelancer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assignableUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Submit ticket"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      {isAdmin && (
        <CmsChipTabs
          value={audienceTab}
          onValueChange={(v) => setAudienceTab(v as AdminAudienceTab)}
          items={[
            { value: "all", label: "All tickets" },
            { value: "client", label: "Client requests" },
            { value: "staff", label: "Dev / QA requests" },
          ]}
        />
      )}

      <PortalKpiGrid
        loading={statsLoading}
        items={[
          {
            title: "Total",
            value: ticketStats.total,
            hint: isAdmin
              ? audienceTab === "all"
                ? "All tickets"
                : audienceTab === "client"
                  ? "Client tickets"
                  : "Staff tickets"
              : "Your tickets",
            icon: TicketIcon,
            accent: "violet",
          },
          { title: "Open", value: ticketStats.open, hint: "Needs first response", icon: AlertCircle, accent: "red", alert: ticketStats.open > 0 },
          { title: "In progress", value: ticketStats.pending, hint: "Active conversation", icon: Clock, accent: "amber" },
          { title: "High priority", value: ticketStats.urgent, hint: "Urgent + high", icon: MessageSquare, accent: "blue", alert: ticketStats.urgent > 0 },
        ]}
      />

      <CmsFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tickets…"
      />

      <CmsChipTabs
        value={statusFilter}
        onValueChange={setStatusFilter}
        items={[
          { value: "all", label: "All status" },
          { value: "open", label: "Open" },
          { value: "pending", label: "In progress" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
        ]}
      />

      <CmsDataTable
        key={isAdmin ? `tickets-${audienceTab}` : "tickets-mine"}
        columns={ticketColumns}
        rows={data?.tickets ?? []}
        rowKey={(ticket) => ticket.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        loadingRows={6}
        onRowClick={(ticket) => openTicket(ticket)}
        viewStorageKey={isAdmin ? "admin-tickets" : "staff-tickets"}
        empty={{
          title: isStaffUser
            ? "No tickets yet — use New ticket to raise a support request"
            : "No tickets found",
        }}
        renderGridCard={(ticket) => (
          <button
            type="button"
            onClick={() => openTicket(ticket)}
            className="text-left rounded-lg border bg-card p-5 hover:border-primary/50 transition-colors w-full"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {statusIcon(ticket.status)}
                  <h3 className="font-semibold leading-none truncate">{ticket.title}</h3>
                  <Badge className={priorityClass(ticket.priority)} variant="secondary">
                    {ticket.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ticket.description?.trim() || "No description."}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2">
                  <span>#{ticket.id}</span>
                  {ticket.projectName ? (
                    <Badge variant="outline" className="text-[10px]">
                      {ticket.projectName}
                    </Badge>
                  ) : null}
                  <span>{creatorLabel(ticket)}</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  <span className="capitalize">
                    {ticket.status === "pending" ? "In progress" : ticket.status}
                  </span>
                </div>
              </div>
              <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </button>
        )}
        gridClassName="grid gap-4"
        pagination={{
          page: data?.page ?? page,
          total: data?.total ?? 0,
          limit,
          loadedRowCount: data?.tickets?.length ?? 0,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      <TicketDetailSheet
        ticket={selectedTicket}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedTicket(null);
        }}
        userRole={role}
        userId={user?.id}
        listQueryKey={listQueryKey}
      />
    </PortalPageShell>
  );
}
