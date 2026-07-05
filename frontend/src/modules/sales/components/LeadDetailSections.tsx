import type { ReactNode } from "react";
import { format } from "date-fns";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Radio,
  Tag,
  User,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/api/sales";
import type { LeadStatus } from "@/modules/sales/types";
import {
  formatCurrency,
  formatLeadContactChannelLabel,
  formatLeadSourceLabel,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from "../constants";
import { formatSalesDateTime } from "../utils";
import { SalesStatusBadge } from "./SalesStatusBadge";
import { ExecutiveAvatar } from "./UserAvatarGroup";

function leadInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DetailItem({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: typeof Mail;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 py-2.5 border-b border-border/60 last:border-0", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "emerald" | "amber" | "violet";
}) {
  const accentClass =
    accent === "emerald"
      ? "from-emerald-500/10 to-transparent border-emerald-500/20"
      : accent === "amber"
        ? "from-amber-500/10 to-transparent border-amber-500/20"
        : accent === "violet"
          ? "from-violet-500/10 to-transparent border-violet-500/20"
          : "from-primary/10 to-transparent border-primary/20";

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-3.5",
        accentClass,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{sub}</p> : null}
    </div>
  );
}

const PIPELINE_STEPS = LEAD_STATUS_ORDER.filter((s) => s !== "lost");

export function LeadDetailHero({
  lead,
  onEdit,
}: {
  lead: Lead;
  onEdit: () => void;
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <div className="relative bg-gradient-to-r from-primary/15 via-primary/5 to-violet-500/10 px-5 py-5 sm:px-6 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 min-w-0">
            <Avatar className="size-14 shrink-0 ring-2 ring-background shadow-md sm:size-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {leadInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{lead.name}</h1>
                <span className="rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground ring-1 ring-border/60">
                  #{lead.id}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {[lead.position?.trim(), lead.company?.trim()].filter(Boolean).join(" · ") || "No company on file"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <SalesStatusBadge variant="lead" value={lead.status} />
                <SalesStatusBadge variant="priority" value={lead.priority} />
                {lead.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    <Tag className="size-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0 h-8 shadow-sm" onClick={onEdit}>
            Edit lead
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function LeadPipelineStrip({ status }: { status: LeadStatus }) {
  if (status === "lost") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        This lead is marked as <span className="font-semibold">Lost</span>.
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.indexOf(status);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline stage
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PIPELINE_STEPS.map((step, index) => {
            const done = index <= currentIndex;
            const active = index === currentIndex;
            return (
              <div key={step} className="flex min-w-0 flex-1 items-center gap-1">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-background",
                      done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      active && "ring-primary/30 scale-110",
                    )}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={cn(
                      "hidden text-center text-[9px] font-medium leading-tight sm:block",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {LEAD_STATUS_LABELS[step]}
                  </span>
                </div>
                {index < PIPELINE_STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "mb-5 h-0.5 min-w-[12px] flex-1 rounded-full",
                      index < currentIndex ? "bg-primary" : "bg-muted",
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground sm:hidden">
          Current: <span className="font-medium text-foreground">{LEAD_STATUS_LABELS[status]}</span>
        </p>
      </CardContent>
    </Card>
  );
}

export function LeadDetailMetrics({ lead }: { lead: Lead }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricTile
        label="Lead value"
        value={formatCurrency(lead.expectedValue)}
        accent="primary"
      />
      <MetricTile
        label="Source"
        value={formatLeadSourceLabel(lead.source)}
        accent="violet"
      />
      <MetricTile
        label="Contact channel"
        value={formatLeadContactChannelLabel(lead.contactChannel)}
        accent="emerald"
      />
      <MetricTile
        label="Next reminder"
        value={
          lead.reminder?.date
            ? format(new Date(lead.reminder.date), "MMM d, yyyy · h:mm a")
            : "Not set"
        }
        sub={lead.reminder?.note}
        accent="amber"
      />
    </div>
  );
}

export function LeadContactCard({ lead }: { lead: Lead }) {
  return (
    <Card className="border-border/80 shadow-sm h-full">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Contact & profile</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <DetailItem icon={Mail} label="Email">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="text-primary hover:underline truncate block">
              {lead.email}
            </a>
          ) : (
            <span className="text-muted-foreground">Not on file</span>
          )}
        </DetailItem>
        <DetailItem icon={Phone} label="Phone">
          {lead.phone?.trim() || <span className="text-muted-foreground">Not on file</span>}
        </DetailItem>
        <DetailItem icon={Building2} label="Company">
          {lead.company?.trim() || <span className="text-muted-foreground">Not on file</span>}
        </DetailItem>
        <DetailItem icon={Briefcase} label="Position">
          {lead.position?.trim() || <span className="text-muted-foreground">Not on file</span>}
        </DetailItem>
        <DetailItem icon={MapPin} label="Address">
          <span className="text-muted-foreground whitespace-pre-wrap">
            {lead.address?.trim() || "Not on file"}
          </span>
        </DetailItem>
        <DetailItem icon={MessageSquare} label="Contact channel">
          {formatLeadContactChannelLabel(lead.contactChannel)}
        </DetailItem>
        <DetailItem icon={Radio} label="Source">
          {formatLeadSourceLabel(lead.source)}
        </DetailItem>
        <DetailItem icon={Calendar} label="Created">
          {formatSalesDateTime(lead.createdAt)}
        </DetailItem>
      </CardContent>
    </Card>
  );
}

export function LeadAssignmentCard({ lead }: { lead: Lead }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Assignment</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
            <User className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Assigned person
            </p>
            {lead.assignedToUser ? (
              <ExecutiveAvatar name={lead.assignedToUser.name} className="mt-1" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Unassigned</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border bg-muted/20 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Status</p>
            <div className="mt-1 flex justify-center">
              <SalesStatusBadge variant="lead" value={lead.status} />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 px-2 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Priority</p>
            <div className="mt-1 flex justify-center">
              <SalesStatusBadge variant="priority" value={lead.priority} />
            </div>
          </div>
        </div>
        {lead.customerId ? (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" asChild>
            <Link href={`/sales/customers/${lead.customerId}`}>View customer record</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LeadDescriptionCard({
  lead,
  onEdit,
}: {
  lead: Lead;
  onEdit: () => void;
}) {
  return (
    <Card className="border-border/80 shadow-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Description & notes</CardTitle>
        {!lead.description?.trim() ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
            Add
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {lead.description?.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {lead.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No description yet. Use Edit lead to add requirements, context, or follow-up notes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function LeadReminderChip({
  reminder,
  onManage,
}: {
  reminder: Lead["reminder"];
  onManage: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onManage}
      className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
    >
      <Bell className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-medium truncate">
          {reminder?.date
            ? format(new Date(reminder.date), "MMM d, yyyy · h:mm a")
            : "Set reminder"}
        </p>
        {reminder?.note ? (
          <p className="text-xs text-muted-foreground truncate">{reminder.note}</p>
        ) : null}
      </div>
    </button>
  );
}
