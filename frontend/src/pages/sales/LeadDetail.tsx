import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  ArrowLeft,
  Plus,
  UserCheck,
  CheckCircle2,
  Pencil,
  Activity,
  StickyNote,
  FileText,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGetLead, useListProposals, useUpdateLead, type LeadActivity } from "@/api/sales";
import type { SalesActivity } from "@/modules/sales/types";
import {
  SalesStatusBadge,
  ActivityTimeline,
  SalesEmptyState,
  FollowUpDialog,
  LeadReminderDialog,
  ConvertLeadDialog,
  LeadFormModal,
  LeadDetailHero,
  LeadPipelineStrip,
  LeadDetailMetrics,
  LeadContactCard,
  LeadAssignmentCard,
  LeadDescriptionCard,
  LeadReminderChip,
} from "@/modules/sales/components";
import { format } from "date-fns";

const ACTIVITY_TYPE_MAP: Record<string, SalesActivity["type"]> = {
  status_change: "lead",
  note_added: "note",
  proposal_created: "proposal",
  follow_up_scheduled: "follow_up",
  follow_up_completed: "follow_up",
  converted: "lead",
  reminder_set: "lead",
  assigned: "lead",
  email_sent: "note",
  created: "lead",
};

function mapActivity(a: LeadActivity): SalesActivity {
  return {
    id: a.id,
    type: ACTIVITY_TYPE_MAP[a.type] ?? "lead",
    title: a.type.replace(/_/g, " "),
    description: a.description,
    actor: a.actor?.name ?? "System",
    createdAt: a.createdAt,
    entityId: a.leadId,
  };
}

export default function LeadDetail() {
  const [, params] = useRoute("/sales/leads/:id");
  const [, navigate] = useLocation();
  const leadId = Number(params?.id);
  const [tab, setTab] = useState("overview");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError } = useGetLead(leadId, !!leadId);
  const { data: proposalsData } = useListProposals({ leadId }, !!leadId);
  const updateLead = useUpdateLead();

  const lead = data;
  const rawActivities = data?.activities ?? [];
  const activities = rawActivities.map(mapActivity);
  const proposals = proposalsData?.proposals ?? [];

  const approveLead = async () => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: "approved" });
      toast.success("Lead marked as approved");
    } catch (err) {
      toastApiError(err, "Failed to update lead");
    }
  };

  if (isLoading) {
    return (
      <PortalPageShell className="space-y-4">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PortalPageShell>
    );
  }

  if (isError || !lead) {
    return (
      <PortalPageShell>
        <SalesEmptyState
          title="Lead not found"
          description={`No lead with ID #${leadId} exists.`}
          actionLabel="Back to leads"
          onAction={() => window.history.back()}
        />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell className="pb-28 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/sales" className="hover:text-foreground transition-colors">Sales</Link>
          <ChevronRight className="size-3" />
          <Link href="/sales/leads" className="hover:text-foreground transition-colors">Leads</Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{lead.name}</span>
        </nav>
        <Button variant="outline" size="sm" className="h-8 w-fit" asChild>
          <Link href="/sales/leads">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to leads
          </Link>
        </Button>
      </div>

      <LeadDetailHero lead={lead} onEdit={() => setEditOpen(true)} />

      <LeadPipelineStrip status={lead.status} />

      <LeadDetailMetrics lead={lead} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/50 p-1 flex-wrap">
          <TabsTrigger value="overview" className="text-xs rounded-lg data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs rounded-lg data-[state=active]:shadow-sm gap-1.5">
            <Activity className="size-3.5" />
            Activity
            {rawActivities.length > 0 ? (
              <span className="rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-semibold">
                {rawActivities.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs rounded-lg data-[state=active]:shadow-sm gap-1.5">
            <FileText className="size-3.5" />
            Proposals
            <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-semibold">
              {proposals.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs rounded-lg data-[state=active]:shadow-sm gap-1.5">
            <StickyNote className="size-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <LeadContactCard lead={lead} />
              <LeadDescriptionCard lead={lead} onEdit={() => setEditOpen(true)} />
            </div>
            <div className="space-y-4">
              <LeadAssignmentCard lead={lead} />
              <LeadReminderChip reminder={lead.reminder} onManage={() => setReminderOpen(true)} />
              <Card className="border-border/80 shadow-sm">
                <CardContent className="pt-4 px-4 pb-4">
                  <p className="text-sm font-semibold mb-3">Recent activity</p>
                  {activities.length > 0 ? (
                    <ActivityTimeline activities={activities} limit={5} />
                  ) : (
                    <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
                  )}
                  {activities.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-7 w-full text-xs"
                      onClick={() => setTab("activity")}
                    >
                      View all activity
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="pt-5 px-4 pb-4">
              {activities.length > 0 ? (
                <ActivityTimeline activities={activities} />
              ) : (
                <SalesEmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="Status changes, follow-ups, and assignments will appear here."
                  actionLabel="Add follow-up"
                  onAction={() => setFollowUpOpen(true)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="mt-0 space-y-3">
          {proposals.length === 0 ? (
            <SalesEmptyState
              icon={FileText}
              title="No proposals yet"
              description="Create a proposal to start quoting this lead."
              actionLabel="Create proposal"
              onAction={() => navigate(`/sales/proposals/create?leadId=${lead.id}`)}
            />
          ) : (
            proposals.map((p) => (
              <Link key={p.id} href={`/sales/proposals/${p.id}`}>
                <Card className="border-border/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.number}</p>
                    </div>
                    <SalesStatusBadge variant="proposal" value={p.status} />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="pt-5 px-4 pb-4">
              {lead.description?.trim() ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {lead.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-4">
                    Last updated {format(new Date(lead.updatedAt), "PPp")}
                  </p>
                </div>
              ) : (
                <SalesEmptyState
                  icon={StickyNote}
                  title="No notes"
                  description="Add a description when creating or editing the lead."
                  actionLabel="Edit lead"
                  onAction={() => setEditOpen(true)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85",
          "px-4 py-3 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]",
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Follow-up
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {lead.reminder ? "Reminder" : "Set reminder"}
          </Button>
          {(lead.status === "proposal_sent" || lead.status === "interested") && (
            <Button variant="outline" size="sm" onClick={approveLead} disabled={updateLead.isPending}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Approve
            </Button>
          )}
          {lead.status !== "converted" && (
            <Button variant="outline" size="sm" onClick={() => setConvertOpen(true)}>
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Convert
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/sales/proposals/create?leadId=${lead.id}`}>Generate proposal</Link>
          </Button>
        </div>
      </div>

      <LeadFormModal open={editOpen} onOpenChange={setEditOpen} lead={lead} />
      <FollowUpDialog open={followUpOpen} onOpenChange={setFollowUpOpen} leadId={leadId} />
      <LeadReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        leadId={leadId}
        initialDate={lead.reminder?.date}
        initialNote={lead.reminder?.note}
      />
      <ConvertLeadDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        leadId={leadId}
        defaultEmail={lead.email}
        defaultCompany={lead.company}
        defaultPhone={lead.phone}
        defaultAddress={lead.address}
      />
    </PortalPageShell>
  );
}
