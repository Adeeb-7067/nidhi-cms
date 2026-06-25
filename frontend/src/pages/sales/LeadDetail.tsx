import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  FileText,
  Phone,
  Mail,
  Building2,
  Calendar,
  MapPin,
  Briefcase,
  Bell,
  ArrowLeft,
  Plus,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGetLead, useListProposals, useUpdateLead, type LeadActivity } from "@/api/sales";
import type { SalesActivity } from "@/modules/sales/types";
import { LEAD_SOURCE_LABELS, formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesStatusBadge,
  ActivityTimeline,
  ExecutiveAvatar,
  SalesEmptyState,
  FollowUpDialog,
  LeadReminderDialog,
  ConvertLeadDialog,
} from "@/modules/sales/components";

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
      <PortalPageShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
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
    <PortalPageShell className="pb-24">
      <SalesPageHeader
        title={lead.name}
        description={lead.company ?? undefined}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Leads", href: "/sales/leads" },
          { label: lead.name },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/sales/leads">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />

      <motion.div className="flex flex-wrap items-center gap-2">
        <SalesStatusBadge variant="lead" value={lead.status} />
        <SalesStatusBadge variant="priority" value={lead.priority} />
        {lead.tags?.map((tag) => (
          <span key={tag} className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground">{tag}</span>
        ))}
        <span className="text-xs text-muted-foreground">#{lead.id}</span>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity {rawActivities.length > 0 && `(${rawActivities.length})`}
          </TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs">
            Proposals ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Expected value</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(lead.expectedValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Source</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-sm font-medium">
                  {lead.source ? (LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] ?? lead.source) : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Reminder</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {lead.reminder ? (
                  <>
                    <p className="text-sm font-medium">{format(new Date(lead.reminder.date), "MMM d, yyyy")}</p>
                    {lead.reminder.note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{lead.reminder.note}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Assigned to</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {lead.assignedToUser ? (
                  <ExecutiveAvatar name={lead.assignedToUser.name} />
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${lead.email}`} className="hover:text-primary truncate">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{lead.company}</span>
                  </div>
                )}
                {lead.position && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{lead.position}</span>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{lead.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Created {format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length > 0 ? (
                  <ActivityTimeline activities={activities} limit={4} />
                ) : (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {activities.length > 0 ? (
                <ActivityTimeline activities={activities} />
              ) : (
                <SalesEmptyState title="No activity" description="Activity will appear here as you work this lead." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4 space-y-3">
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
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.number}</p>
                    </div>
                    <SalesStatusBadge variant="proposal" value={p.status} />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {lead.description ? (
                <p className="text-sm whitespace-pre-wrap">{lead.description}</p>
              ) : (
                <SalesEmptyState title="No notes" description="Add a description when creating or editing the lead." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "px-4 py-3 flex flex-wrap gap-2 justify-end",
        )}
      >
        <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add follow-up
        </Button>
        <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
          <Bell className="h-3.5 w-3.5 mr-1.5" />
          {lead.reminder ? "Edit reminder" : "Set reminder"}
        </Button>
        {(lead.status === "proposal_sent" || lead.status === "interested") && (
          <Button variant="outline" size="sm" onClick={approveLead} disabled={updateLead.isPending}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Approve lead
          </Button>
        )}
        {lead.status !== "converted" && (
          <Button variant="outline" size="sm" onClick={() => setConvertOpen(true)}>
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            Convert to customer
          </Button>
        )}
        <Button size="sm" asChild>
          <Link href={`/sales/proposals/create?leadId=${lead.id}`}>Generate proposal</Link>
        </Button>
      </div>

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
      />
    </PortalPageShell>
  );
}
