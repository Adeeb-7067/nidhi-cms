import React, { useState, useMemo } from "react";
import {
  useListTickets,
  useUpdateTicket,
  useCreateTicket,
  getListTicketsQueryKey,
  useListProjects,
  useListUsers,
} from "@/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ChevronDown,
  ChevronRight,
  Ticket,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  projectId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assignedTo: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useDataViewMode("admin-tickets", "grid");
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  const { data, isLoading } = useListTickets({
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    page,
    limit: 10,
  });
  const { data: statsData, isLoading: statsLoading } = useListTickets({ limit: 500 });

  const ticketStats = useMemo(() => {
    const tickets = statsData?.tickets ?? [];
    return {
      total: statsData?.total ?? tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      pending: tickets.filter((t) => t.status === "pending").length,
      urgent: tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length,
    };
  }, [statsData]);

  const { data: projectsData } = useListProjects({ limit: 100 });
  const { data: usersData } = useListUsers({ role: "developer", limit: 100 });

  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket();

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const onSubmit = async (values: TicketFormValues) => {
    try {
      await createMutation.mutateAsync({
        data: {
          ...values,
          projectId: values.projectId ? parseInt(values.projectId) : undefined,
          assignedTo: values.assignedTo ? parseInt(values.assignedTo) : undefined,
        } as any
      });
      toast.success("Ticket created");
      setIsCreateOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
    } catch (err) {
      toastApiError(err, "Failed to create ticket");
    }
  };

  const handleStatusChange = async (ticketId: number, status: string) => {
    try {
      await updateMutation.mutateAsync({
        id: ticketId,
        data: { status } as any
      });
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
    } catch (err) {
      toastApiError(err, "Failed to update status");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      case "resolved": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "closed": return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/10 text-red-500";
      case "high": return "bg-orange-500/10 text-orange-500";
      case "medium": return "bg-amber-500/10 text-amber-500";
      case "low": return "bg-green-500/10 text-green-500";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">Manage client issues and internal tasks</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input placeholder="Issue title..." {...field} /></FormControl>
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
                      <FormControl><Textarea placeholder="Details..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {projectsData?.projects.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl>
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
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select developer" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {usersData?.users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Ticket"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {statsLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard title="Total tickets" value={ticketStats.total} hint="All support tickets" icon={Ticket} accent="violet" delay={0} />
          <StatCard title="Open" value={ticketStats.open} hint="Needs attention" icon={AlertCircle} accent="red" alert={ticketStats.open > 0} delay={1} />
          <StatCard title="Pending" value={ticketStats.pending} hint="Awaiting action" icon={Clock} accent="amber" delay={2} />
          <StatCard title="High priority" value={ticketStats.urgent} hint="Urgent + high" icon={MessageSquare} accent="blue" alert={ticketStats.urgent > 0} delay={3} />
        </PageKpiRow>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
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
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === "table" ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10" aria-label="Expand" />
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : !data?.tickets?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                data.tickets.map((ticket: any) => {
                  const isExpanded = expandedTicketId === ticket.id;
                  return (
                    <React.Fragment key={ticket.id}>
                      <TableRow className={cn(isExpanded && "bg-muted/30")}>
                        <TableCell className="w-10 align-top py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setExpandedTicketId(isExpanded ? null : ticket.id)
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium align-top whitespace-normal max-w-[280px]">
                          {ticket.title}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm align-top">
                          {ticket.projectName || "—"}
                        </TableCell>
                        <TableCell className="text-sm align-top">
                          {ticket.assigneeName || "Unassigned"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground align-top">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <Select
                            value={ticket.status}
                            onValueChange={(val) => handleStatusChange(ticket.id, val)}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="p-0 border-b bg-muted/20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-4 text-sm">
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                                  Description
                                </p>
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {ticket.description?.trim() || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                                  Details
                                </p>
                                <ul className="space-y-1 text-muted-foreground">
                                  <li>ID: #{ticket.id}</li>
                                  <li>Created by: {ticket.creatorName || "—"}</li>
                                  <li>Project: {ticket.projectName || "—"}</li>
                                  <li>
                                    Created: {new Date(ticket.createdAt).toLocaleString()}
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
      <div className="grid gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Card key={i} className="h-32 animate-pulse bg-muted" />)
        ) : (
          data?.tickets.map((ticket: any) => (
            <Card key={ticket.id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <h3 className="font-semibold leading-none">{ticket.title}</h3>
                      <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {ticket.description?.trim() || "No description."}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        ID: #{ticket.id}
                      </span>
                      {ticket.projectName && (
                        <Badge variant="outline" className="text-[10px]">
                          {ticket.projectName}
                        </Badge>
                      )}
                      <span>By: {ticket.creatorName}</span>
                      <span>Assigned to: {ticket.assigneeName || "Unassigned"}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(val) => handleStatusChange(ticket.id, val)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      )}

      <DataPagination
        total={data?.total || 0}
        limit={10}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
