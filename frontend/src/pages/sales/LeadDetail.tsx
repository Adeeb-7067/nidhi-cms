import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { format } from "date-fns";
import {
  ArrowLeft, Activity, Bell, Briefcase, Building2, Calendar,
  CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Download, FileText, FileImage, FolderOpen, Mail, MapPin,
  MessageSquare, Pencil, Phone, Plus, Radio, RefreshCw, Send,
  StickyNote, Tag, Trash2, TrendingUp, User, UserCheck, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { cn } from "@/lib/utils";
import {
  useGetLead,
  useListProposals,
  useUpdateLead,
  useAddPlanningDoc,
  useRemovePlanningDoc,
  useSendProposal,
  type LeadActivity,
  type PlanningDoc,
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
  LEAD_NO_FOLLOW_UP_STATUSES,
} from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { FileUploader } from "@/components/ui/file-uploader";

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, accentClass = "text-primary" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accentClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-current/10", accentClass)}>
          {icon}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-black tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] line-clamp-1 text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

/* ─── Contact row ──────────────────────────────────────────────────────────── */
function ContactRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border last:border-0">
      <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{label}</p>
        <div className="mt-0.5 text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

/* ─── Section card shell ───────────────────────────────────────────────────── */
function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-5 py-4 border-b border-border sm:px-6">
      {icon}
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
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
  document_removed:    "note",
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

/* ─── Project Planning Docs ─────────────────────────────────────────────────── */
const ACCEPTED_TYPES = "application/pdf,image/jpeg,image/png,image/webp,image/gif";

function isImageUrl(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

function DocIcon({ url }: { url: string }) {
  if (isImageUrl(url)) return <FileImage className="h-4 w-4 text-primary" />;
  return <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
}

function PlanningDocRow({
  doc,
  onRemove,
  removing,
}: {
  doc: PlanningDoc;
  onRemove: () => void;
  removing: boolean;
}) {
  const url = resolveFileUrl(doc.url);
  const isImg = isImageUrl(doc.url);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 border",
        isImg
          ? "bg-primary/10 border-primary/20"
          : "bg-orange-500/10 border-orange-500/20",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
          isImg ? "bg-primary/15" : "bg-orange-500/15",
        )}
      >
        <DocIcon url={doc.url} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate text-foreground">{doc.name}</p>
        <p className="text-[10px] mt-0.5 text-muted-foreground">
          {isImg ? "Image" : "PDF"} · {new Date(doc.uploadedAt).toLocaleDateString()}
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="h-3 w-3" />View
      </a>
      <button
        disabled={removing}
        onClick={onRemove}
        className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface PendingUpload {
  file: File;
  uploadedUrl: string;
  name: string;
}

function ProjectPlanningDocs({ leadId, docs, leadStatus }: {
  leadId: number;
  docs: PlanningDoc[];
  leadStatus: string;
}) {
  const [pendingName, setPendingName]   = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [removingUrl, setRemovingUrl]   = useState<string | null>(null);
  const [uploaderKey, setUploaderKey]   = useState(0);

  const addDoc    = useAddPlanningDoc(leadId);
  const removeDoc = useRemovePlanningDoc(leadId);

  const handleUploadComplete = (url: string, meta?: { fileName: string }) => {
    if (!url) return;
    const rawName = meta?.fileName ?? url.split("/").pop() ?? "Document";
    const nameWithoutExt = rawName.replace(/\.[^/.]+$/, "");
    setPendingUpload({ file: new File([], rawName), uploadedUrl: url, name: nameWithoutExt });
    setPendingName(nameWithoutExt);
  };

  const confirmAdd = async () => {
    if (!pendingUpload) return;
    const name = pendingName.trim() || pendingUpload.name;
    try {
      await addDoc.mutateAsync({ name, url: pendingUpload.uploadedUrl });
      const isFirst = docs.length === 0;
      if (isFirst && leadStatus === "project_planning") {
        toast.success("Document saved — pipeline advanced to Proposal Sent.");
      } else {
        toast.success(`"${name}" added.`);
      }
      setPendingUpload(null);
      setPendingName("");
      setUploaderKey((k) => k + 1);
    } catch (err) {
      toastApiError(err, "Failed to save document.");
    }
  };

  const cancelPending = () => {
    setPendingUpload(null);
    setPendingName("");
    setUploaderKey((k) => k + 1);
  };

  const handleRemove = async (url: string) => {
    setRemovingUrl(url);
    try {
      await removeDoc.mutateAsync(url);
      toast.success("Document removed.");
    } catch (err) {
      toastApiError(err, "Failed to remove document.");
    } finally {
      setRemovingUrl(null);
    }
  };

  return (
    <SectionCard className="h-full">
      <SectionHeader
        icon={<FolderOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
        title="Project Planning Docs"
      >
        {docs.length > 0 && (
          <span className="ml-1 flex items-center justify-center h-4 min-w-4 rounded-full px-1 text-[9px] font-bold bg-orange-600 text-white dark:bg-orange-500">
            {docs.length}
          </span>
        )}
        {docs.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />{docs.length} file{docs.length !== 1 ? "s" : ""}
          </span>
        )}
      </SectionHeader>

      <div className="p-5 space-y-3">
        {docs.length > 0 && (
          <div className="space-y-2">
            {docs.map((doc) => (
              <PlanningDocRow
                key={doc.url}
                doc={doc}
                onRemove={() => void handleRemove(doc.url)}
                removing={removingUrl === doc.url}
              />
            ))}
          </div>
        )}

        {pendingUpload ? (
          <div className="rounded-xl p-3 space-y-2.5 border border-emerald-500/20 bg-emerald-500/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              File uploaded — give it a name
            </p>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Document name…"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void confirmAdd(); }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 text-xs px-3"
                disabled={addDoc.isPending}
                onClick={() => void confirmAdd()}
              >
                {addDoc.isPending ? "Saving…" : "Add"}
              </Button>
              <button
                onClick={cancelPending}
                className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {docs.length === 0 && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Upload the project planning PDF or images to auto-advance the pipeline to{" "}
                <span className="font-medium text-foreground">Proposal Sent</span>.
              </p>
            )}
            <FileUploader
              key={uploaderKey}
              accept={ACCEPTED_TYPES}
              category="misc"
              variant="dropzone"
              label={docs.length > 0 ? "Add another document or image" : "Upload PDF or image (max 50MB)"}
              maxSizeMB={50}
              onUploadComplete={handleUploadComplete}
            />
          </>
        )}
      </div>
    </SectionCard>
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
  const [sendingProposalId, setSendingProposalId] = useState<number | null>(null);
  const [proposalOpen,      setProposalOpen]      = useState(false);

  const { data: lead, isLoading, isError } = useGetLead(leadId, !!leadId);
  const { data: proposalsData, refetch: refetchProposals } = useListProposals({ leadId }, !!leadId);
  const updateLead   = useUpdateLead();
  const sendProposal = useSendProposal();

  const rawActivities = lead?.activities ?? [];
  const activities    = rawActivities.map(mapActivity);
  const proposals     = proposalsData?.proposals ?? [];

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
  const isClosedElsewhere = lead.status === "closed_elsewhere";
  const pauseFollowUps = LEAD_NO_FOLLOW_UP_STATUSES.includes(lead.status);
  const descText    = lead.description?.trim() ?? "";
  const needsDescExpand  = descText.length > 300 || descText.split("\n").length > 5;
  const needsNotesExpand = descText.length > 300 || descText.split("\n").length > 5;

  return (
    <PortalPageShell className="pb-28 space-y-5">

      {/* ── Breadcrumb + header actions ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/sales" className="transition-colors hover:text-foreground">Sales</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/sales/leads" className="transition-colors hover:text-foreground">Leads</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium truncate max-w-[200px] text-foreground">{lead.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/sales/leads"><ArrowLeft className="h-3.5 w-3.5" />Back</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />Edit
          </Button>
          {!pauseFollowUps && (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setProposalOpen(true)}>
              <FileText className="h-3.5 w-3.5" />Generate proposal
            </Button>
          )}
        </div>
      </div>

      {/* ── Hero banner ── */}
      <SectionCard className="overflow-hidden">
        <div className="relative px-6 py-5 border-b border-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 bg-primary text-primary-foreground">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-foreground">{lead.name}</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  #{lead.id}
                </span>
              </div>
              <p className="text-sm mb-2.5 text-muted-foreground">
                {[lead.position?.trim(), lead.company?.trim()].filter(Boolean).join(" · ") || "No company on file"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <SalesStatusBadge variant="lead" value={lead.status} />
                <SalesStatusBadge variant="priority" value={lead.priority} />
                {lead.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                  >
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Alert banners ── */}
      {isLost && (
        <div className="rounded-xl px-4 py-3.5 flex gap-3 border border-destructive/20 bg-destructive/10">
          <span className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0 bg-destructive" />
          <p className="text-sm font-medium text-destructive">
            This lead is marked as <strong>Lost</strong>.
          </p>
        </div>
      )}
      {isClosedElsewhere && (
        <div className="rounded-xl px-4 py-3.5 flex gap-3 border border-slate-500/25 bg-slate-500/10">
          <span className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0 bg-slate-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Client <strong>closed a deal elsewhere</strong>.
            </p>
            <p className="text-xs mt-0.5 text-slate-600 dark:text-slate-400">
              Follow-ups and reminders are paused. You can reopen outreach later by changing the status.
            </p>
          </div>
        </div>
      )}
      {isConverted && lead.customerId && (
        <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/10">
          <span className="h-2 w-2 rounded-full flex-shrink-0 bg-emerald-500" />
          <p className="text-sm font-medium flex-1 text-emerald-800 dark:text-emerald-200">
            This lead has been <strong>converted</strong> to a customer.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-shrink-0 border-emerald-700/40 text-emerald-900 hover:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/40"
            asChild
          >
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
          accentClass="text-primary"
        />
        <StatCard
          icon={<Radio className="h-3.5 w-3.5" />}
          label="Source"
          value={formatLeadSourceLabel(lead.source)}
          accentClass="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label="Contact channel"
          value={formatLeadContactChannelLabel(lead.contactChannel)}
          accentClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<Bell className="h-3.5 w-3.5" />}
          label="Next reminder"
          value={lead.reminder?.date ? format(new Date(lead.reminder.date), "MMM d, yyyy") : "Not set"}
          sub={lead.reminder?.note}
          accentClass="text-orange-600 dark:text-orange-400"
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
              <SectionCard>
                <SectionHeader
                  icon={<User className="h-4 w-4 text-primary" />}
                  title="Contact & Profile"
                />
                <div className="px-6 py-4">
                  <div className="space-y-0">
                    <ContactRow icon={Mail} label="Email">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="transition-colors hover:underline text-primary">
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not on file</span>
                      )}
                    </ContactRow>
                    <ContactRow icon={Phone} label="Phone">
                      {lead.phone?.trim() ? lead.phone : <span className="text-muted-foreground">Not on file</span>}
                    </ContactRow>
                    <ContactRow icon={Building2} label="Company">
                      {lead.company?.trim() ? lead.company : <span className="text-muted-foreground">Not on file</span>}
                    </ContactRow>
                    <ContactRow icon={Briefcase} label="Position">
                      {lead.position?.trim() ? lead.position : <span className="text-muted-foreground">Not on file</span>}
                    </ContactRow>
                    {lead.address?.trim() ? (
                      <ContactRow icon={MapPin} label="Address">
                        <span className="whitespace-pre-line">{lead.address}</span>
                      </ContactRow>
                    ) : null}
                    <ContactRow icon={Calendar} label="Created">
                      {formatSalesDateTime(lead.createdAt)}
                    </ContactRow>
                  </div>
                </div>
              </SectionCard>

              {/* Description — clamped to 5 lines, expandable */}
              <SectionCard>
                <SectionHeader
                  icon={<StickyNote className="h-4 w-4 text-primary" />}
                  title="Description & Notes"
                >
                  <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditOpen(true)}>
                    {descText ? "Edit" : "Add"}
                  </Button>
                </SectionHeader>
                <div className="px-6 py-5">
                  {descText ? (
                    <>
                      <p
                        className={cn(
                          "text-sm leading-relaxed whitespace-pre-wrap text-foreground",
                          !descExpanded && "line-clamp-5",
                        )}
                      >
                        {descText}
                      </p>
                      {needsDescExpand && (
                        <button
                          type="button"
                          className="mt-2 flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-70"
                          onClick={() => setDescExpanded((v) => !v)}
                        >
                          {descExpanded
                            ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                            : <><ChevronDown className="h-3.5 w-3.5" />Show more</>
                          }
                        </button>
                      )}
                      <p className="text-[10px] mt-3 text-muted-foreground">
                        Last updated {format(new Date(lead.updatedAt), "dd MMM yyyy, h:mm a")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description yet. Use Edit lead to add requirements, context, or follow-up notes.
                    </p>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Right: Assignment + Reminder + Recent Activity */}
            <div className="space-y-4">

              {/* Assignment */}
              <SectionCard>
                <SectionHeader
                  icon={<User className="h-4 w-4 text-primary" />}
                  title="Assignment"
                />
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 bg-primary/10 text-primary">
                      {lead.assignedToUser ? lead.assignedToUser.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-primary">
                        Assigned to
                      </p>
                      {lead.assignedToUser ? (
                        <p className="text-sm font-semibold text-foreground">{lead.assignedToUser.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unassigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 bg-primary/10 text-primary">
                      {lead.createdByUser ? lead.createdByUser.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-primary">
                        Created by
                      </p>
                      {lead.createdByUser ? (
                        <p className="text-sm font-semibold text-foreground">{lead.createdByUser.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unknown</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-3 text-center bg-muted/40 border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-muted-foreground">Status</p>
                      <SalesStatusBadge variant="lead" value={lead.status} />
                    </div>
                    <div className="rounded-xl p-3 text-center bg-muted/40 border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-muted-foreground">Priority</p>
                      <SalesStatusBadge variant="priority" value={lead.priority} />
                    </div>
                  </div>
                  {lead.customerId ? (
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs" asChild>
                      <Link href={`/sales/customers/${lead.customerId}`}>View customer record</Link>
                    </Button>
                  ) : null}
                </div>
              </SectionCard>

              {/* Reminder */}
              <button
                type="button"
                className={cn(
                  "w-full text-left rounded-2xl border border-border bg-card transition-colors",
                  pauseFollowUps ? "opacity-70 cursor-default" : "hover:bg-muted/30",
                )}
                onClick={() => {
                  if (!pauseFollowUps) setReminderOpen(true);
                }}
                disabled={pauseFollowUps}
              >
                <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Reminder</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {pauseFollowUps ? "Paused" : lead.reminder ? "Edit" : "Set"}
                  </span>
                </div>
                <div className="px-5 py-3">
                  {pauseFollowUps ? (
                    <p className="text-sm text-muted-foreground">
                      {isClosedElsewhere
                        ? "Reminders paused while the client’s deal is closed elsewhere."
                        : "Reminders are paused for this lead status."}
                    </p>
                  ) : lead.reminder ? (
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {format(new Date(lead.reminder.date), "dd MMM yyyy · h:mm a")}
                      </p>
                      {lead.reminder.note ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lead.reminder.note}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No reminder set.</p>
                  )}
                </div>
              </button>

              {/* Recent Activity */}
              <SectionCard>
                <SectionHeader
                  icon={<Activity className="h-4 w-4 text-primary" />}
                  title="Recent activity"
                />
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
                    <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Activity tab ── */}
        <TabsContent value="activity" className="mt-0">
          <SectionCard>
            <SectionHeader
              icon={<Activity className="h-4 w-4 text-primary" />}
              title="Activity"
            >
              {rawActivities.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {rawActivities.length}
                </span>
              )}
            </SectionHeader>
            <div className="p-6">
              {activities.length > 0 ? (
                <ActivityTimeline activities={activities} />
              ) : (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No activity yet</p>
                  <p className="text-xs text-center text-muted-foreground">
                    Status changes, follow-ups, and assignments will appear here.
                  </p>
                  {!pauseFollowUps && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setFollowUpOpen(true)}>
                      Add follow-up
                    </Button>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Proposals tab ── */}
        <TabsContent value="proposals" className="mt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {proposals.length > 0
                  ? `${proposals.length} proposal${proposals.length === 1 ? "" : "s"}`
                  : "No proposals yet"}
              </p>
              {isClosedElsewhere && (
                <p className="text-[11px] mt-0.5 text-muted-foreground">
                  Outreach paused — reopen the lead status before creating or sending proposals.
                </p>
              )}
              {!isClosedElsewhere && proposals.some((p) => p.status === "seen") && (
                <p className="text-[11px] mt-0.5 text-orange-600 dark:text-orange-400">
                  A proposal has been viewed by the client — you can send another or resend.
                </p>
              )}
            </div>
            {!pauseFollowUps && (
              <Button
                size="sm" className="h-8 gap-1.5 text-xs"
                onClick={() => setProposalOpen(true)}
              >
                <Plus className="size-3.5" />New proposal
              </Button>
            )}
          </div>

          {proposals.length === 0 ? (
            <SectionCard>
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No proposals yet</p>
                <p className="text-xs text-muted-foreground">
                  {pauseFollowUps
                    ? "Proposals are paused for this lead status."
                    : "Create a proposal to start quoting this lead."}
                </p>
                {!pauseFollowUps && (
                  <Button
                    size="sm" className="h-8 text-xs mt-1"
                    onClick={() => setProposalOpen(true)}
                  >
                    Create proposal
                  </Button>
                )}
              </div>
            </SectionCard>
          ) : (
            proposals.map((p) => {
              const canSend   = !pauseFollowUps && ["draft", "revised", "counter_offer"].includes(p.status);
              const canResend = !pauseFollowUps && ["sent", "seen"].includes(p.status);
              const isSending = sendingProposalId === p.id;
              const isCurrent = lead.proposalId === p.id;

              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-2xl p-4 border",
                    isCurrent
                      ? "bg-primary/10 border-primary/20"
                      : "bg-card border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/sales/proposals/${p.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {p.title}
                        </Link>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                            Current
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/sales/proposals/${p.id}`}
                        className="text-xs mt-0.5 block text-muted-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {p.number}
                      </Link>
                      <p className="text-[10px] mt-1 text-muted-foreground/80">
                        Created {formatSalesDateTime(p.createdAt)}
                        {p.sentAt ? ` · Sent ${format(new Date(p.sentAt), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <SalesStatusBadge variant="proposal" value={p.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
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
            <SectionCard>
              <SectionHeader
                icon={<StickyNote className="h-4 w-4 text-primary" />}
                title="Notes"
              >
                <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setEditOpen(true)}>
                  {descText ? "Edit" : "Add"}
                </Button>
              </SectionHeader>
              <div className="p-5">
                {descText ? (
                  <>
                    <p
                      className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap text-foreground",
                        !notesExpanded && "line-clamp-8",
                      )}
                    >
                      {descText}
                    </p>
                    {needsNotesExpand && (
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-70"
                        onClick={() => setNotesExpanded((v) => !v)}
                      >
                        {notesExpanded
                          ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                          : <><ChevronDown className="h-3.5 w-3.5" />Show more</>
                        }
                      </button>
                    )}
                    <p className="text-[10px] mt-3 text-muted-foreground">
                      Last updated {format(new Date(lead.updatedAt), "dd MMM yyyy, h:mm a")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No notes yet. Add a description when editing the lead.
                  </p>
                )}
              </div>
            </SectionCard>

            {/* Project Planning Docs */}
            <ProjectPlanningDocs
              leadId={leadId}
              docs={lead?.planningDocs ?? []}
              leadStatus={lead?.status ?? ""}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Floating action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-4 py-3 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
          </Button>
          {!pauseFollowUps && (
            <>
              <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Follow-up
              </Button>
              <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                {lead.reminder ? "Reminder" : "Set reminder"}
              </Button>
            </>
          )}
          {(lead.status === "proposal_sent" || lead.status === "interested" || lead.status === "project_planning") && (
            <Button variant="outline" size="sm" onClick={approveLead} disabled={updateLead.isPending}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Approve
            </Button>
          )}
          {lead.status !== "converted" && lead.status !== "closed_elsewhere" && (
            <Button variant="outline" size="sm" onClick={() => setConvertOpen(true)}>
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />Convert
            </Button>
          )}
          {!pauseFollowUps && (
            <Button size="sm" onClick={() => setProposalOpen(true)}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />Generate proposal
            </Button>
          )}
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
