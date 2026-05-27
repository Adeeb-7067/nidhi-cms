import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  FileText,
  Phone,
  Mail,
  Building2,
  Calendar,
  ArrowLeft,
  Plus,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getLeadById,
  mockActivities,
  mockProposals,
} from "@/modules/sales/mock-data";
import {
  LEAD_SOURCE_LABELS,
  formatCurrency,
} from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesStatusBadge,
  ActivityTimeline,
  ExecutiveAvatar,
  SalesEmptyState,
} from "@/modules/sales/components";
import { toast } from "sonner";

export default function LeadDetail() {
  const [, params] = useRoute("/sales/leads/:id");
  const leadId = Number(params?.id);
  const lead = getLeadById(leadId);
  const [tab, setTab] = useState("overview");

  const proposals = useMemo(
    () => mockProposals.filter((p) => p.leadId === leadId),
    [leadId],
  );

  const activities = useMemo(
    () =>
      mockActivities.filter(
        (a) =>
          a.entityId === leadId ||
          a.description.toLowerCase().includes(lead?.name.toLowerCase() ?? ""),
      ),
    [leadId, lead?.name],
  );

  if (!lead) {
    return (
      <SalesEmptyState
        title="Lead not found"
        description={`No lead with ID #${leadId} exists in the demo data.`}
        actionLabel="Back to leads"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <PortalPageShell className="pb-24">
      <SalesPageHeader
        title={lead.name}
        description={lead.company}
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
        <span className="text-xs text-muted-foreground">#{lead.id}</span>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity
          </TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs">
            Proposals ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
                  Expected value
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(lead.expectedValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
                  Source
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-sm font-medium">{LEAD_SOURCE_LABELS[lead.source]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
                  Next follow-up
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-sm font-medium">
                  {lead.nextFollowUp
                    ? format(new Date(lead.nextFollowUp), "MMM d, yyyy h:mm a")
                    : "Not scheduled"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
                  Assigned to
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ExecutiveAvatar name={lead.assignedTo.name} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${lead.email}`} className="hover:text-primary truncate">
                    {lead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{lead.company}</span>
                </div>
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
                <SalesEmptyState
                  title="No activity"
                  description="Activity will appear here as you work this lead."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4 space-y-3">
          {proposals.length === 0 ? (
            <SalesEmptyState
              icon={FileText}
              title="No proposals yet"
              description="Convert this lead to a proposal to start quoting."
              actionLabel="Create proposal"
              onAction={() => toast.success("Opening proposal form (demo)")}
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
              {lead.notes ? (
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              ) : (
                <SalesEmptyState
                  title="No notes"
                  description="Add notes to capture context for this lead."
                />
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success("Follow-up scheduled (demo)")}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add follow-up
        </Button>
        {(lead.status === "proposal_sent" || lead.status === "interested") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Lead marked as approved (demo)")}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Approve lead
          </Button>
        )}
        {(lead.status === "approved" || lead.status === "proposal_sent") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Converting to customer (demo)")}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            Convert to customer
          </Button>
        )}
        <Button size="sm" asChild>
          <Link href="/sales/proposals/create">Generate proposal</Link>
        </Button>
      </div>
    </PortalPageShell>
  );
}
