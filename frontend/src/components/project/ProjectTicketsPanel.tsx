import { useMemo, useState } from "react";
import {
  useListTickets,
  getListTicketsQueryKey,
  type Ticket,
  type TicketListResult,
} from "@/api";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import { TicketDetailSheet } from "@/components/tickets/ticket-detail-sheet";
import { formatDistanceToNow } from "date-fns";
import { Search, X } from "lucide-react";

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function ticketStatusClass(status: string): string {
  switch (status) {
    case "open":
      return "text-blue-600 border-blue-500/30 bg-blue-500/10";
    case "pending":
      return "text-amber-600 border-amber-500/30 bg-amber-500/10";
    case "resolved":
      return "text-green-600 border-green-500/30 bg-green-500/10";
    case "closed":
      return "text-muted-foreground border-border bg-muted/30";
    default:
      return "text-muted-foreground border-border bg-muted/30";
  }
}

function ticketPriorityClass(priority: string): string {
  switch (priority) {
    case "urgent":
      return "text-red-600 border-red-500/30 bg-red-500/10";
    case "high":
      return "text-orange-600 border-orange-500/30 bg-orange-500/10";
    case "low":
      return "text-muted-foreground border-border bg-muted/30";
    default:
      return "text-blue-600 border-blue-500/30 bg-blue-500/10";
  }
}

interface ProjectTicketsPanelProps {
  projectId: number;
  userRole?: string;
  userId?: number;
}

export function ProjectTicketsPanel({ projectId, userRole, userId }: ProjectTicketsPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const params = { projectId, audience: "client" as const, limit: 100 };
  const { data: ticketsData, isLoading } = useListTickets(params, {
    query: {
      enabled: !!projectId,
      queryKey: getListTicketsQueryKey(params),
    },
  });
  const tickets = (ticketsData as unknown as TicketListResult)?.tickets ?? [];

  const rows = useMemo(() => {
    return tickets.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const { pageItems, pagination } = useClientPagination(rows, DEFAULT_TABLE_PAGE_SIZE);

  const hasFilters = search || statusFilter !== "all" || priorityFilter !== "all";

  const columns = useMemo((): CmsColumn<Ticket>[] => [
    {
      id: "title",
      header: "Title",
      cell: (ticket) => (
        <span className="font-medium max-w-[280px] truncate block">{ticket.title}</span>
      ),
    },
    {
      id: "raisedBy",
      header: "Raised by",
      className: "w-[140px]",
      cell: (ticket) => (
        <span className="text-muted-foreground truncate max-w-[130px] block">
          {ticket.creatorName ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      className: "w-[110px]",
      cell: (ticket) => (
        <Badge variant="outline" className={`text-xs ${ticketStatusClass(ticket.status)}`}>
          {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
        </Badge>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      chip: true,
      className: "w-[100px]",
      cell: (ticket) => (
        <Badge variant="outline" className={`text-xs ${ticketPriorityClass(ticket.priority)}`}>
          {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
        </Badge>
      ),
    },
    {
      id: "created",
      header: "Created",
      className: "w-[120px]",
      cell: (ticket) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ], []);

  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search tickets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.keys(TICKET_STATUS_LABELS).map((s) => (
            <SelectItem key={s} value={s}>
              {TICKET_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {Object.keys(TICKET_PRIORITY_LABELS).map((p) => (
            <SelectItem key={p} value={p}>
              {TICKET_PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setPriorityFilter("all");
          }}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        {rows.length} ticket{rows.length !== 1 ? "s" : ""}
      </span>
    </div>
  );

  return (
    <div className="space-y-3 p-3">
      <CmsDataTable
        columns={columns}
        rows={pageItems}
        rowKey={(ticket) => ticket.id}
        isLoading={isLoading}
        embedded
        toolbar={filterToolbar}
        empty={{
          title: tickets.length === 0
            ? "No client tickets for this project yet."
            : "No tickets match your filters.",
        }}
        onRowClick={setSelectedTicket}
        getRowClassName={() => "text-sm cursor-pointer"}
        pagination={pagination}
      />

      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}
        userRole={userRole}
        userId={userId}
        listQueryKey={getListTicketsQueryKey(params)}
      />
    </div>
  );
}
