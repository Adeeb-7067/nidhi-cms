import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { format } from "date-fns";
import {
  ArrowLeft, Activity, Bell, Briefcase, Building2, Calendar,
  CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Clock,
  Download, ExternalLink, FileText, FolderOpen, Mail, MapPin,
  MessageSquare, Pencil, Phone, Plus, Radio, RefreshCw, Send,
  StickyNote, Tag, TrendingUp, User, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  useGetLead,
  useListProposals,
  useUpdateLead,
  useSendProposal,
  type LeadActivity,
} from "@/api/sales";
import { apiUrl } from "@/lib/api-base";
import type { SalesActivity } from "@/modules/sales/types";
import {
  SalesStatusBadge,
  ActivityTimeline,
  SalesEmptyState,
  FollowUpDialog,
  LeadReminderDialog,
  ConvertLeadDialog,
  LeadFormModal,
  LeadPipelineStrip,
  ProposalFormSheet,
} from "@/modules/sales/components";
import {
  formatCurrency,
  formatLeadContactChannelLabel,
  formatLeadSourceLabel,
} from "@/modules/sales/constants";
import { FileUploader } from "@/components/ui/file-uploader";

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const P = {
  blue:       "#1A56DB",
  blueLight:  "#EFF6FF",
  blueBorder: "#BFDBFE",
  orange:     "#E8630A",
  green:      "#057A55",
  red:        "#C81E1E",
  dark:       "#111928",
  muted:      "#6B7280",
  subtle:     "#9CA3AF",
  border:     "#E5E7EB",
};

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = P.blue }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl p-4 space-y-1.5" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </span>
        <span className="text-xs" style={{ color: P.muted }}>{label}</span>
      </div>
      <p className="text-lg font-black tabular-nums" style={{ color: P.dark }}>{value}</p>
      {sub && <p className="text-[10px] line-clamp-1" style={{ color: P.subtle }}>{sub}</p>}
    </div>
  );
}

/* ─── Contact row ──────────────────────────────────────────────────────────── */
function ContactRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5" style={{ borderBottom: `1px solid ${P.border}` }}>
      <span
        className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg"
        style={{ background: P.blueLight }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: P.blue }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.blue }}>{label}</p>
        <div className="mt-0.5 text-sm" style={{ color: P.dark }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── Activity type map ────────────────────────────────────────────────────── */
const ACTIVITY_TYPE_MAP: Record<string, SalesActivity["type"]> = {
  status_change:       "lead",
  note_added:          "note",
  proposal_created:    "proposal",
  follow_up_scheduled: "follow_up",
  follow_up_completed: "follow_up",
  converted:           "lead",
  reminder_set:        "lead",
  assigned:            "lead",
  email_sent:          "note",
  created:             "lead",
  document_uploaded:   "note",
};

function mapActivity(a: LeadActivity): SalesActivity {
  return {
    id:          a.id,
    type:        ACTIVITY_TYPE_MAP[a.type] ?? "lead",
    title:       a.type.replace(/_/g, " "),
    description: a.description,
    actor:       a.actor?.name ?? "System",
    createdAt:   a.createdAt,
    entityId:    a.leadId,
  };
}

function resolveFileUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return apiUrl(url.startsWith("/") ? url : `/${url}`);
}

/* ─── Project Planning Doc ─────────────────────────────────────────────────── */
function ProjectPlanningDoc({ leadId, currentDoc, onDocChange }: {
  leadId: number; currentDoc: string | null; onDocChange: (url: string | null) => void;
}) {
  const [saving,    setSaving]    = useState(false);
  const [replacing, setReplacing] = useState(false);
  const updateLead = useUpdateLead();

  const saveDoc = async (url: string | null) => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateLead.mutateAsync({ id: leadId, projectPlanningDoc: url } as any);
      onDocChange(url);
      if (url) toast.success("Document saved — pipeline advanced to Proposal Sent.");
      else toast.success("Document removed.");
    } catch (err) {
      toastApiError(err, "Failed to save document.");
    } finally {
      setSaving(false);
      setReplacing(false);
    }
  };

  const resolvedUrl = currentDoc ? resolveFileUrl(currentDoc) : null;

  return (
    <div className="rounded-2xl h-full" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
        <FolderOpen className="h-4 w-4" style={{ color: P.orange }} />
        <h3 className="text-sm font-bold" style={{ color: P.dark }}>Project Planning Doc</h3>
        {resolvedUrl && !replacing && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold" style={{ color: P.green }}>
            <CheckCircle2 className="h-3.5 w-3.5" />Uploaded
          </span>
        )}
      </div>
      <div className="p-5 space-y-3">
        {resolvedUrl && !replacing ? (
          <>
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-3"
              style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0" style={{ background: "#FFEDD5" }}>
                <FileText className="h-4 w-4" style={{ color: P.orange }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={{ color: P.dark }}>Project Planning PDF</p>
                <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>Document on file</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5" asChild>
                <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />View
                </a>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={saving} onClick={() => setReplacing(true)}>
                Replace
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs text-destructive hover:text-destructive"
                disabled={saving}
                onClick={() => void saveDoc(null)}
              >
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs leading-relaxed" style={{ color: P.muted }}>
              {replacing
                ? "Upload a new PDF to replace the current document."
                : <>Upload the project planning PDF to auto-advance the pipeline to{" "}
                    <span className="font-medium" style={{ color: P.dark }}>Proposal Sent</span>.</>
              }
            </p>
            <FileUploader
              accept="application/pdf"
              category="misc"
              variant="dropzone"
              label="Upload Project Planning PDF"
              maxSizeMB={50}
              onUploadComplete={(url) => {
                if (url) void saveDoc(url);
                else if (replacing) setReplacing(false);
              }}
            />
            {replacing && (
              <Button size="sm" variant="ghost" className="h-7 w-full text-xs" onClick={() => setReplacing(false)}>
                Cancel
              </Button>
            )}
            {saving && (
              <p className="text-center text-xs animate-pulse" style={{ color: P.muted }}>Saving…</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────────── */
export default function LeadDetail() {
  const [, params]   = useRoute("/sales/leads/:id");
  const [, navigate] = useLocation();
  const leadId = Number(params?.id);

  const [tab,               setTab]               = useState("overview");
  const [followUpOpen,      setFollowUpOpen]      = useState(false);
  const [reminderOpen,      setReminderOpen]      = useState(false);
  const [convertOpen,       setConvertOpen]       = useState(false);
  const [editOpen,          setEditOpen]          = useState(false);
  const [descExpanded,      setDescExpanded]      = useState(false);
  const [notesExpanded,     setNotesExpanded]     = useState(false);
  const [localDoc,          setLocalDoc]          = useState<string | null | undefined>(undefined);
  const [sendingProposalId, setSendingProposalId] = useState<number | null>(null);
  const [proposalOpen,      setProposalOpen]      = useState(false);

  const { data: lead, isLoading, isError } = useGetLead(leadId, !!leadId);
  const { data: proposalsData, refetch: refetchProposals } = useListProposals({ leadId }, !!leadId);
  const updateLead   = useUpdateLead();
  const sendProposal = useSendProposal();

  const rawActivities      = lead?.activities ?? [];
  const activities         = rawActivities.map(mapActivity);
  const proposals          = proposalsData?.proposals ?? [];
  const projectPlanningDoc = localDoc !== undefined ? localDoc : (lead?.projectPlanningDoc ?? null);

  const approveLead = async () => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: "approved" });
      toast.success("Lead approved");
    } catch (err) {
      toastApiError(err, "Failed to update lead");
    }
  };

  const handleSendProposal = async (proposalId: number) => {
    setSendingProposalId(proposalId);
    try {
      const result    = await sendProposal.mutateAsync({ id: proposalId });
      const emailSent = (result as { emailSent?: boolean })?.emailSent;
      const to        = (result as { sentToEmail?: string })?.sentToEmail;
      toast.success("Proposal sent", {
        description: emailSent ? `Email delivered to ${to}` : "Status updated — no email on file.",
      });
      void refetchProposals();
    } catch (err) {
      toastApiError(err, "Failed to send proposal");
    } finally {
      setSendingProposalId(null);
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <PortalPageShell className="space-y-4">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
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

  const isLost      = lead.status === "lost";
  const isConverted = lead.status === "converted";
  const descText    = lead.description?.trim() ?? "";
  const needsDescExpand  = descText.length > 300 || descText.split("\n").length > 5;
  const needsNotesExpand = descText.length > 300 || descText.split("\n").length > 5;

  return (
    <PortalPageShell className="pb-28 space-y-5">

      {/* ── Breadcrumb + header actions ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-1 text-xs" style={{ color: P.muted }}>
          <Link href="/sales" className="transition-colors hover:text-foreground">Sales</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/sales/leads" className="transition-colors hover:text-foreground">Leads</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium truncate max-w-[200px]" style={{ color: P.dark }}>{lead.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/sales/leads"><ArrowLeft className="h-3.5 w-3.5" />Back</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />Edit
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setProposalOpen(true)}>
            <FileText className="h-3.5 w-3.5" />Generate proposal
          </Button>
        </div>
      </div>

      {/* ── Hero banner ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
        <div
          className="px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${P.blueLight} 0%, #fff 60%)`, borderBottom: `1px solid ${P.border}` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0"
              style={{ background: P.blue, color: "#fff" }}
            >
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black" style={{ color: P.dark }}>{lead.name}</h1>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                  style={{ background: P.blueLight, color: P.blue, border: `1px solid ${P.blueBorder}` }}
                >
                  #{lead.id}
                </span>
              </div>
              <p className="text-sm mb-2.5" style={{ color: P.muted }}>
                {[lead.position?.trim(), lead.company?.trim()].filter(Boolean).join(" · ") || "No company on file"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <SalesStatusBadge variant="lead" value={lead.status} />
                <SalesStatusBadge variant="priority" value={lead.priority} />
                {lead.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: "#F3F4F6", color: P.muted, border: `1px solid ${P.border}` }}
                  >
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert banners ── */}
      {isLost && (
        <div className="rounded-xl px-4 py-3.5 flex gap-3" style={{ background: "#FEF2F2", border: `1px solid #FECACA` }}>
          <span className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: P.red }} />
          <p className="text-sm font-medium" style={{ color: "#991B1B" }}>
            This lead is marked as <strong>Lost</strong>.
          </p>
        </div>
      )}
      {isConverted && lead.customerId && (
        <div className="rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ background: "#ECFDF5", border: "1px solid #BBF7D0" }}>
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: P.green }} />
          <p className="text-sm font-medium flex-1" style={{ color: "#065F46" }}>
            This lead has been <strong>converted</strong> to a customer.
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" asChild>
            <Link href={`/sales/customers/${lead.customerId}`}>View customer</Link>
          </Button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Expected value"
          value={formatCurrency(lead.expectedValue)}
          color={P.blue}
        />
        <StatCard
          icon={<Radio className="h-3.5 w-3.5" />}
          label="Source"
          value={formatLeadSourceLabel(lead.source)}
          color="#7C3AED"
        />
        <StatCard
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label="Contact channel"
          value={formatLeadContactChannelLabel(lead.contactChannel)}
          color={P.green}
        />
        <StatCard
          icon={<Bell className="h-3.5 w-3.5" />}
          label="Next reminder"
          value={lead.reminder?.date ? format(new Date(lead.reminder.date), "MMM d, yyyy") : "Not set"}
          sub={lead.reminder?.note}
          color={P.orange}
        />
      </div>

      {/* ── Pipeline strip ── */}
      <LeadPipelineStrip status={lead.status} />

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/50 p-1 flex-wrap">
          <TabsTrigger value="overview" className="text-xs rounded-lg data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs rounded-lg data-[state=active]:shadow-sm gap-1.5">
            <Activity className="size-3.5" />
            Activity
            {rawActivities.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-semibold">
                {rawActivities.length}
              </span>
            )}
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
            Notes & Documents
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Left: Contact + Description */}
            <div className="lg:col-span-2 space-y-4">

              {/* Contact & Profile */}
              <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
                <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <User className="h-4 w-4" style={{ color: P.blue }} />
                  <h3 className="text-sm font-bold" style={{ color: P.dark }}>Contact & Profile</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="[&>*:last-child]:border-0 space-y-0">
                    <ContactRow icon={Mail} label="Email">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="transition-colors hover:underline" style={{ color: P.blue }}>
                          {lead.email}
                        </a>
                      ) : (
                        <span style={{ color: P.subtle }}>Not on file</span>
                      )}
                    </ContactRow>
                    <ContactRow icon={Phone} label="Phone">
                      {lead.phone?.trim() ? lead.phone : <span style={{ color: P.subtle }}>Not on file</span>}
                    </ContactRow>
                    <ContactRow icon={Building2} label="Company">
                      {lead.company?.trim() ? lead.company : <span style={{ color: P.subtle }}>Not on file</span>}
                    </ContactRow>
                    <ContactRow icon={Briefcase} label="Position">
                      {lead.position?.trim() ? lead.position : <span style={{ color: P.subtle }}>Not on file</span>}
                    </ContactRow>
                    {lead.address?.trim() ? (
                      <ContactRow icon={MapPin} label="Address">
                        <span className="whitespace-pre-line">{lead.address}</span>
                      </ContactRow>
                    ) : null}
                    <ContactRow icon={Calendar} label="Created">
                      {format(new Date(lead.createdAt), "dd MMM yyyy")}
                    </ContactRow>
                  </div>
                </div>
              </div>

              {/* Description — clamped to 5 lines, expandable */}
              <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
                <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <StickyNote className="h-4 w-4" style={{ color: P.blue }} />
                  <h3 className="text-sm font-bold" style={{ color: P.dark }}>Description & Notes</h3>
                  <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditOpen(true)}>
                    {descText ? "Edit" : "Add"}
                  </Button>
                </div>
                <div className="px-6 py-5">
                  {descText ? (
                    <>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{
                          color: P.dark,
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: descExpanded ? "unset" : 5,
                          overflow: "hidden",
                        } as React.CSSProperties}
                      >
                        {descText}
                      </p>
                      {needsDescExpand && (
                        <button
                          type="button"
                          className="mt-2 flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                          style={{ color: P.blue }}
                          onClick={() => setDescExpanded((v) => !v)}
                        >
                          {descExpanded
                            ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                            : <><ChevronDown className="h-3.5 w-3.5" />Show more</>
                          }
                        </button>
                      )}
                      <p className="text-[10px] mt-3" style={{ color: P.subtle }}>
                        Last updated {format(new Date(lead.updatedAt), "dd MMM yyyy, h:mm a")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: P.subtle }}>
                      No description yet. Use Edit lead to add requirements, context, or follow-up notes.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Assignment + Reminder + Recent Activity */}
            <div className="space-y-4">

              {/* Assignment */}
              <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <User className="h-4 w-4" style={{ color: P.blue }} />
                  <h3 className="text-sm font-bold" style={{ color: P.dark }}>Assignment</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: P.blueLight, color: P.blue }}
                    >
                      {lead.assignedToUser ? lead.assignedToUser.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: P.blue }}>
                        Assigned to
                      </p>
                      {lead.assignedToUser ? (
                        <p className="text-sm font-semibold" style={{ color: P.dark }}>{lead.assignedToUser.name}</p>
                      ) : (
                        <p className="text-sm" style={{ color: P.subtle }}>Unassigned</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-3 text-center" style={{ background: "#F9FAFB", border: `1px solid ${P.border}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: P.muted }}>Status</p>
                      <SalesStatusBadge variant="lead" value={lead.status} />
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: "#F9FAFB", border: `1px solid ${P.border}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: P.muted }}>Priority</p>
                      <SalesStatusBadge variant="priority" value={lead.priority} />
                    </div>
                  </div>
                  {lead.customerId ? (
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs" asChild>
                      <Link href={`/sales/customers/${lead.customerId}`}>View customer record</Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Reminder */}
              <button
                type="button"
                className="w-full text-left rounded-2xl transition-colors hover:opacity-90"
                style={{ background: "#fff", border: `1px solid ${P.border}` }}
                onClick={() => setReminderOpen(true)}
              >
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <Bell className="h-4 w-4" style={{ color: P.orange }} />
                  <h3 className="text-sm font-bold" style={{ color: P.dark }}>Reminder</h3>
                  <span className="ml-auto text-xs" style={{ color: P.blue }}>
                    {lead.reminder ? "Manage" : "Set"}
                  </span>
                </div>
                <div className="p-5">
                  {lead.reminder ? (
                    <div className="rounded-xl p-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                      <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: "#92400E" }}>
                        <Clock className="h-3 w-3" />
                        {format(new Date(lead.reminder.date), "dd MMM yyyy")}
                      </p>
                      {lead.reminder.note && (
                        <p className="text-xs line-clamp-2" style={{ color: "#78350F" }}>{lead.reminder.note}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: P.subtle }}>No reminder set — click to add one.</p>
                  )}
                </div>
              </button>

              {/* Recent Activity */}
              <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <Activity className="h-4 w-4" style={{ color: P.blue }} />
                  <h3 className="text-sm font-bold" style={{ color: P.dark }}>Recent activity</h3>
                </div>
                <div className="p-5">
                  {activities.length > 0 ? (
                    <>
                      <ActivityTimeline activities={activities} limit={5} />
                      {activities.length > 5 && (
                        <Button
                          variant="ghost" size="sm"
                          className="mt-3 h-7 w-full text-xs"
                          onClick={() => setTab("activity")}
                        >
                          View all {activities.length} events
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: P.subtle }}>No activity recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Activity tab ── */}
        <TabsContent value="activity" className="mt-0">
          <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <Activity className="h-4 w-4" style={{ color: P.blue }} />
              <h3 className="text-sm font-bold" style={{ color: P.dark }}>Activity</h3>
              {rawActivities.length > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: P.blueLight, color: P.blue }}
                >
                  {rawActivities.length}
                </span>
              )}
            </div>
            <div className="p-6">
              {activities.length > 0 ? (
                <ActivityTimeline activities={activities} />
              ) : (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: P.blueLight }}>
                    <Activity className="h-4 w-4" style={{ color: P.blue }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: P.dark }}>No activity yet</p>
                  <p className="text-xs text-center" style={{ color: P.subtle }}>
                    Status changes, follow-ups, and assignments will appear here.
                  </p>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setFollowUpOpen(true)}>
                    Add follow-up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Proposals tab ── */}
        <TabsContent value="proposals" className="mt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: P.dark }}>
                {proposals.length > 0
                  ? `${proposals.length} proposal${proposals.length === 1 ? "" : "s"}`
                  : "No proposals yet"}
              </p>
              {proposals.some((p) => p.status === "seen") && (
                <p className="text-[11px] mt-0.5" style={{ color: P.orange }}>
                  A proposal has been viewed by the client — you can send another or resend.
                </p>
              )}
            </div>
            <Button
              size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => setProposalOpen(true)}
            >
              <Plus className="size-3.5" />New proposal
            </Button>
          </div>

          {proposals.length === 0 ? (
            <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: P.blueLight }}>
                  <FileText className="h-4 w-4" style={{ color: P.blue }} />
                </div>
                <p className="text-sm font-medium" style={{ color: P.dark }}>No proposals yet</p>
                <p className="text-xs" style={{ color: P.subtle }}>Create a proposal to start quoting this lead.</p>
                <Button
                  size="sm" className="h-8 text-xs mt-1"
                  onClick={() => setProposalOpen(true)}
                >
                  Create proposal
                </Button>
              </div>
            </div>
          ) : (
            proposals.map((p) => {
              const canSend   = ["draft", "revised", "counter_offer"].includes(p.status);
              const canResend = ["sent", "seen"].includes(p.status);
              const isSending = sendingProposalId === p.id;
              const isCurrent = lead.proposalId === p.id;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: isCurrent ? P.blueLight : "#fff",
                    border:     `1px solid ${isCurrent ? P.blueBorder : P.border}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: P.dark }}>{p.title}</p>
                        {isCurrent && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: P.blue, color: "#fff" }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: P.muted }}>{p.number}</p>
                      <p className="text-[10px] mt-1" style={{ color: P.subtle }}>
                        Created {format(new Date(p.createdAt), "MMM d, yyyy")}
                        {p.sentAt ? ` · Sent ${format(new Date(p.sentAt), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <SalesStatusBadge variant="proposal" value={p.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                    {canSend && (
                      <Button
                        size="sm" className="h-7 text-xs gap-1.5"
                        disabled={isSending}
                        onClick={() => void handleSendProposal(p.id)}
                      >
                        <Send className="h-3 w-3" />
                        {isSending ? "Sending…" : "Send to client"}
                      </Button>
                    )}
                    {canResend && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                        disabled={isSending}
                        onClick={() => void handleSendProposal(p.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {isSending ? "Sending…" : "Resend"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 ml-auto" asChild>
                      <Link href={`/sales/proposals/${p.id}`}>
                        <ExternalLink className="h-3 w-3" />Open
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ── Notes & Documents tab ── */}
        <TabsContent value="notes" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Notes — clamped */}
            <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                <StickyNote className="h-4 w-4" style={{ color: P.blue }} />
                <h3 className="text-sm font-bold" style={{ color: P.dark }}>Notes</h3>
                <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditOpen(true)}>
                  {descText ? "Edit" : "Add"}
                </Button>
              </div>
              <div className="p-5">
                {descText ? (
                  <>
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        color: P.dark,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: notesExpanded ? "unset" : 8,
                        overflow: "hidden",
                      } as React.CSSProperties}
                    >
                      {descText}
                    </p>
                    {needsNotesExpand && (
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                        style={{ color: P.blue }}
                        onClick={() => setNotesExpanded((v) => !v)}
                      >
                        {notesExpanded
                          ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                          : <><ChevronDown className="h-3.5 w-3.5" />Show more</>
                        }
                      </button>
                    )}
                    <p className="text-[10px] mt-3" style={{ color: P.subtle }}>
                      Last updated {format(new Date(lead.updatedAt), "dd MMM yyyy, h:mm a")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: P.subtle }}>
                    No notes yet. Add a description when editing the lead.
                  </p>
                )}
              </div>
            </div>

            {/* Project Planning Doc */}
            <ProjectPlanningDoc
              leadId={leadId}
              currentDoc={projectPlanningDoc}
              onDocChange={(url) => setLocalDoc(url)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Floating action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-4 py-3 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Follow-up
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {lead.reminder ? "Reminder" : "Set reminder"}
          </Button>
          {(lead.status === "proposal_sent" || lead.status === "interested" || lead.status === "project_planning") && (
            <Button variant="outline" size="sm" onClick={approveLead} disabled={updateLead.isPending}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Approve
            </Button>
          )}
          {lead.status !== "converted" && (
            <Button variant="outline" size="sm" onClick={() => setConvertOpen(true)}>
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />Convert
            </Button>
          )}
          <Button size="sm" onClick={() => setProposalOpen(true)}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />Generate proposal
          </Button>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <LeadFormModal open={editOpen} onOpenChange={setEditOpen} lead={lead} />
      <ProposalFormSheet open={proposalOpen} onOpenChange={setProposalOpen} defaultLeadId={lead.id} />
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
