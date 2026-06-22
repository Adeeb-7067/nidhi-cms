import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LogIn,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  KeyRound,
  Mail,
  PowerOff,
  Power,
  FileUp,
  FileDown,
  ListChecks,
} from "lucide-react";

import { useClientTeam } from "@/contexts/ClientTeamContext";
import { useClientTeamMembers, useClientTeamActivity, type ClientTeamActivityRow } from "@/api/client-team";
import {
  PortalPageShell,
  PortalPageHero,
  PortalContentCard,
  PortalEmptyState,
} from "@/components/layout/portal-page-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  member_invited: "Invited team member",
  member_updated: "Updated team member",
  member_deactivated: "Deactivated team member",
  member_reactivated: "Reactivated team member",
  permissions_updated: "Updated permissions",
  password_reset: "Reset password",
  invitation_resent: "Re-sent invitation",
  comment_posted: "Posted a comment",
  document_uploaded: "Uploaded a document",
  document_downloaded: "Downloaded a document",
  status_update_viewed: "Viewed status update",
  user_action: "Performed an action",
};

const ACTION_ICONS: Record<string, typeof Activity> = {
  login: LogIn,
  logout: LogIn,
  member_invited: UserPlus,
  member_updated: UserCog,
  member_deactivated: PowerOff,
  member_reactivated: Power,
  permissions_updated: ShieldCheck,
  password_reset: KeyRound,
  invitation_resent: Mail,
  comment_posted: MessageSquare,
  document_uploaded: FileUp,
  document_downloaded: FileDown,
  status_update_viewed: ListChecks,
  user_action: Settings,
};

function actionBadgeClass(action: string): string {
  if (action === "login") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (action === "comment_posted") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  if (action === "permissions_updated") return "bg-violet-500/15 text-violet-700 border-violet-500/30";
  if (action.startsWith("member_") || action === "invitation_resent" || action === "password_reset")
    return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  if (action.startsWith("document_")) return "bg-cyan-500/15 text-cyan-700 border-cyan-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function ActivityIcon({ action }: { action: string }) {
  const Icon = ACTION_ICONS[action] ?? Activity;
  return <Icon className="h-3.5 w-3.5" />;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function ActivityRowItem({ row }: { row: ClientTeamActivityRow }) {
  const initials = (row.actorName ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const when = new Date(row.createdAt);

  return (
    <li className="flex gap-3 border-b border-border/40 px-4 py-3 last:border-b-0">
      <Avatar className="h-9 w-9 border border-border/60">
        <AvatarImage src={row.actorAvatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/15 text-[11px] font-bold text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">
            {row.actorName ?? "Unknown user"}
            {row.actorIsAdmin ? (
              <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                · admin
              </span>
            ) : null}
          </p>
          <Badge variant="outline" className={cn("gap-1 text-[10px]", actionBadgeClass(row.action))}>
            <ActivityIcon action={row.action} />
            {actionLabel(row.action)}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {row.summary ?? actionLabel(row.action)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/80" title={format(when, "PPpp")}>
          {formatDistanceToNow(when, { addSuffix: true })}
          {row.ipAddress ? <> · IP {row.ipAddress}</> : null}
        </p>
      </div>
    </li>
  );
}

const PAGE_LIMIT = 50;

export default function ClientTeamActivityPage() {
  const team = useClientTeam();
  const [page, setPage] = useState(1);
  const [memberFilter, setMemberFilter] = useState<"all" | number>("all");
  const [actionFilter, setActionFilter] = useState<string>("");

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      ...(memberFilter !== "all" ? { userId: memberFilter } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
    }),
    [page, memberFilter, actionFilter],
  );

  const { data, isLoading, isFetching, refetch } = useClientTeamActivity(
    filters,
    team.isClientUser,
  );
  const memberList = useClientTeamMembers({ limit: 200 }, team.isAdmin);

  if (team.isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </PortalPageShell>
    );
  }

  if (!team.isClientUser) {
    return (
      <PortalPageShell>
        <PortalEmptyState
          icon={Activity}
          title="Activity log unavailable"
          description="Sign in as a client account to see your company's activity."
        />
      </PortalPageShell>
    );
  }

  const rows = data?.activities ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <PortalPageShell>
      <PortalPageHero
        badge={team.isAdmin ? "Client team" : "Your activity"}
        title="Activity log"
        subtitle={
          team.isAdmin
            ? "Sign-ins, comments, documents, and member changes across your team."
            : "Recent actions you've taken in the portal."
        }
        actions={
          <div className="flex items-center gap-2">
            {team.isAdmin ? (
              <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                <Link href="/client/team">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to team
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      <PortalContentCard contentClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {team.isAdmin ? (
              <Select
                value={memberFilter === "all" ? "all" : String(memberFilter)}
                onValueChange={(value) => {
                  setPage(1);
                  setMemberFilter(value === "all" ? "all" : Number(value));
                }}
              >
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {(memberList.data?.members ?? []).map((m) => (
                    <SelectItem key={m.userId} value={String(m.userId)}>
                      {m.name} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select
              value={actionFilter || "all"}
              onValueChange={(value) => {
                setPage(1);
                setActionFilter(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="h-9 w-[200px] text-xs">
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? "entry" : "entries"}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <PortalEmptyState
            icon={Activity}
            title="No activity yet"
            description="Activity will appear here as members sign in and use the portal."
          />
        ) : (
          <ul className="divide-y divide-border/40">
            {rows.map((row) => (
              <ActivityRowItem key={row.id} row={row} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border/60 p-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </PortalContentCard>
    </PortalPageShell>
  );
}
