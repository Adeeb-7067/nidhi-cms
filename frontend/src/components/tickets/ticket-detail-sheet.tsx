import React from "react";
import {
  useUpdateTicket,
  getListTicketsQueryKey,
  type Ticket,
  type TicketStatus,
} from "@/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Building2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { TicketCommentsSection } from "./ticket-comments";
import { formatUserRole } from "@/lib/bug-workflow";

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

export function TicketDetailSheet({
  ticket,
  open,
  onOpenChange,
  userRole,
  userId,
  listQueryKey,
}: {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  userId?: number;
  listQueryKey?: unknown;
}) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateTicket();
  const isAdmin = userRole === "super_admin";
  const isResolved = ticket?.status === "resolved" || ticket?.status === "closed";
  const canComment = !!ticket && !isResolved;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
    if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
  };

  const patchStatus = async (status: TicketStatus) => {
    if (!ticket) return;
    try {
      await updateMutation.mutateAsync({ id: ticket.id, data: { status } });
      toast.success(status === "resolved" ? "Ticket marked resolved" : "Status updated");
      invalidate();
    } catch (err) {
      toastApiError(err, "Failed to update ticket");
    }
  };

  if (!ticket) return null;

  const audienceLabel =
    ticket.audience === "client" ? "Client request" : "Dev / QA request";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0 space-y-3">
          <div className="flex flex-wrap items-start gap-2 pr-8">
            {statusIcon(ticket.status)}
            <SheetTitle className="text-left text-lg leading-snug flex-1 min-w-0">
              {ticket.title}
            </SheetTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={priorityClass(ticket.priority)} variant="secondary">
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {ticket.status}
            </Badge>
            {isAdmin && (
              <Badge variant="secondary" className="text-[10px]">
                {audienceLabel}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              Raised by {ticket.creatorName ?? "Unknown"}
              {ticket.creatorRole ? ` · ${formatUserRole(ticket.creatorRole)}` : ""}
            </span>
            {ticket.projectName ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {ticket.projectName}
              </span>
            ) : null}
            <span>
              #{ticket.id} · opened{" "}
              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
              Description
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
              {ticket.description?.trim() || "—"}
            </p>
          </div>

          <TicketCommentsSection
            ticketId={ticket.id}
            canComment={canComment}
            userRole={userRole}
            listQueryKey={listQueryKey}
          />
        </div>

        <div className="shrink-0 border-t px-6 py-4 flex flex-col sm:flex-row gap-2 bg-muted/20">
          {isAdmin ? (
            <>
              <Select
                value={ticket.status}
                onValueChange={(val) => patchStatus(val as TicketStatus)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="sm:w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">In progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="flex-1"
                disabled={isResolved || updateMutation.isPending}
                onClick={() => patchStatus("resolved")}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Mark resolved
              </Button>
            </>
          ) : (
            <p
              className={cn(
                "text-xs text-muted-foreground flex items-center gap-2 flex-1",
                ticket.status === "pending" && "text-amber-700",
              )}
            >
              {statusIcon(ticket.status)}
              {ticket.status === "open" && "Waiting for support to respond."}
              {ticket.status === "pending" && "Support is working on your ticket."}
              {isResolved && "This ticket is closed. Open a new ticket if you need more help."}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
