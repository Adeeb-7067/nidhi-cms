import React, { useEffect, useMemo, useState } from "react";
import {
  useListTickets,
  useCreateTicket,
  getListTicketsQueryKey,
  useListProjects,
  useListUsers,
  getListProjectsQueryKey,
  getListUsersQueryKey,
  type Ticket,
  type TicketAudience,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Search,
  Plus,
  Filter,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ticket as TicketIcon,
  Headphones,
  Wrench,
  LayoutGrid,
} from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { cn } from "@/lib/utils";
import { DataViewToggle } from "@/components/ui/data-view-toggle";
import { useDataViewMode } from "@/lib/data-view";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useTablePagination } from "@/lib/table-pagination";
import { TicketDetailSheet } from "@/components/tickets/ticket-detail-sheet";
import { formatUserRole } from "@/lib/bug-workflow";
import { isDevPortalRole } from "@/lib/navigation";

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
  const { page, setPage, resetPage } = useTablePagination(12);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useDataViewMode(
    isAdmin ? "admin-tickets" : "staff-tickets",
    isStaffUser ? "table" : "grid",
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const listParams = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(isAdmin && audienceTab !== "all" ? { audience: audienceTab } : {}),
      page,
      limit: 12,
    }),
    [search, statusFilter, audienceTab, isAdmin, page],
  );

  const listQueryKey = getListTicketsQueryKey(listParams);

  const { data, isLoading } = useListTickets(listParams);
  const { data: statsData, isLoading: statsLoading } = useListTickets(
    isAdmin
      ? audienceTab !== "all"
        ? { limit: 500, audience: audienceTab }
        : { limit: 500 }
      : { limit: 500 },
  );

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, audienceTab, resetPage]);

  const ticketStats = useMemo(() => {
    const tickets = statsData?.tickets ?? [];
    return {
      total: statsData?.total ?? tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      pending: tickets.filter((t) => t.status === "pending").length,
      urgent: tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length,
    };
  }, [statsData]);

  const projectsParams = { limit: 100 };
  const { data: projectsData } = useListProjects(projectsParams, {
    query: {
      queryKey: getListProjectsQueryKey(projectsParams),
      enabled: isCreateOpen && (isAdmin || role === "client"),
    },
  });
  const usersParams = { role: "developer" as const, limit: 100 };
  const { data: usersData } = useListUsers(usersParams, {
    query: {
      queryKey: getListUsersQueryKey(usersParams),
      enabled: isCreateOpen && isAdmin,
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageSubtitle}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New ticket
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
                              <SelectValue placeholder="Developer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {usersData?.users.map((u) => (
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
      </div>

      {isAdmin && (
        <Tabs
          value={audienceTab}
          onValueChange={(v) => setAudienceTab(v as AdminAudienceTab)}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              All tickets
            </TabsTrigger>
            <TabsTrigger value="client" className="gap-2">
              <Headphones className="h-4 w-4" />
              Client requests
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Wrench className="h-4 w-4" />
              Dev / QA requests
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {statsLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard
            title="Total"
            value={ticketStats.total}
            hint={
              isAdmin
                ? audienceTab === "all"
                  ? "All tickets"
                  : audienceTab === "client"
                    ? "Client tickets"
                    : "Staff tickets"
                : "Your tickets"
            }
            icon={TicketIcon}
            accent="violet"
            delay={0}
          />
          <StatCard
            title="Open"
            value={ticketStats.open}
            hint="Needs first response"
            icon={AlertCircle}
            accent="red"
            alert={ticketStats.open > 0}
            delay={1}
          />
          <StatCard
            title="In progress"
            value={ticketStats.pending}
            hint="Active conversation"
            icon={Clock}
            accent="amber"
            delay={2}
          />
          <StatCard
            title="High priority"
            value={ticketStats.urgent}
            hint="Urgent + high"
            icon={MessageSquare}
            accent="blue"
            alert={ticketStats.urgent > 0}
            delay={3}
          />
        </PageKpiRow>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DataViewToggle value={viewMode} onChange={setViewMode} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === "table" ? (
        <div
          key={isAdmin ? `tickets-${audienceTab}` : "tickets-mine"}
          className="rounded-md border bg-card overflow-hidden"
        >
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Raised by</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.tickets?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground text-sm"
                  >
                    {isStaffUser
                      ? "No tickets yet — use New ticket to raise a support request"
                      : "No tickets found"}
                  </TableCell>
                </TableRow>
              ) : (
                data.tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => openTicket(ticket)}
                  >
                    <TableCell className="font-medium whitespace-normal max-w-[280px]">
                      <span className="flex items-center gap-2">
                        {statusIcon(ticket.status)}
                        {ticket.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityClass(ticket.priority)} variant="secondary">
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {creatorLabel(ticket)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ticket.projectName || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right capitalize text-sm">
                      {ticket.status === "pending" ? "In progress" : ticket.status}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)
          ) : !data?.tickets?.length ? (
            <p className="text-center text-sm text-muted-foreground py-12">No tickets found</p>
          ) : (
            data.tickets.map((ticket) => (
              <button
                key={ticket.id}
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
                      {ticket.projectName && (
                        <Badge variant="outline" className="text-[10px]">
                          {ticket.projectName}
                        </Badge>
                      )}
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
            ))
          )}
        </div>
      )}

      <DataPagination
        page={data?.page ?? page}
        total={data?.total ?? 0}
        limit={data?.limit ?? 12}
        onPageChange={setPage}
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
    </div>
  );
}
