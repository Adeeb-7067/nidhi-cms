import { useState, useRef, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  ArrowLeft, Copy, ExternalLink, FileText, Globe, History,
  Link2, Monitor, Send, CheckCircle2, XCircle, Clock,
  AlertTriangle, MessageSquare, User, Building2, Phone, AtSign,
  RefreshCw, Eye, Shield, Pencil, Download, Loader2, Trash2, TrendingUp,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsKpiGrid } from "@/components/cms/cms-kpi";
import {
  useGetProposal, useGetProposalLogs, useSendProposal,
  useApproveProposal, useDeclineProposal, useCounterProposal, useReviseProposal,
  useDeleteProposal, useUpdateProposal, useProposalComments, useAddStaffComment, useListInstallments,
  type ProposalComment, type ProposalLog, type PublicProposal, type ProposalStatus,
} from "@/api/sales";
import { formatCurrency, PROPOSAL_STATUS_OPTIONS } from "@/modules/sales/constants";
import { resolveProposalTotal, formatSalesDateTime, formatInstallmentSequence, formatDiscountPercent } from "@/modules/sales/utils";
import { downloadElementAsPdf } from "@/modules/sales/pdf-download";
import { useSalesDocumentBranding } from "@/modules/sales/hooks/use-sales-document-branding";
import { cn } from "@/lib/utils";
import {
  SalesPageHeader, SalesStatusBadge, ExecutiveAvatar, SalesEmptyState, ProposalDocument, ProposalFormSheet,
  InstallmentsFromProposalDialog,
} from "@/modules/sales/components";

/** PDF export palette — on-screen UI uses theme tokens */
const PDF = {
  blue: "#1A56DB",
  orange: "#E8630A",
  green: "#057A55",
  red: "#C81E1E",
  muted: "#6B7280",
  subtle: "#9CA3AF",
};

type EventTone = { label: string; dotClass: string; textClass: string; bgClass: string };

const EVENT_CFG: Record<string, EventTone> = {
  viewed:        { label: "Client opened link",   dotClass: "bg-violet-500", textClass: "text-violet-700 dark:text-violet-300", bgClass: "bg-violet-500/10" },
  approved:      { label: "Client accepted",      dotClass: "bg-green-500",  textClass: "text-green-700 dark:text-green-300",   bgClass: "bg-green-500/10" },
  declined:      { label: "Client declined",      dotClass: "bg-red-500",    textClass: "text-red-700 dark:text-red-300",       bgClass: "bg-red-500/10" },
  counter_offer: { label: "Client counter offer", dotClass: "bg-amber-500",  textClass: "text-amber-700 dark:text-amber-300",   bgClass: "bg-amber-500/10" },
};

function eventCfg(event: string): EventTone {
  return EVENT_CFG[event] ?? {
    label: event,
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
    bgClass: "bg-muted",
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-primary">
      {children}
    </p>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────────── */
export default function ProposalDetail() {
  const [, params] = useRoute("/sales/proposals/:id");
  const [, navigate] = useLocation();
  const proposalId = Number(params?.id);
  const [showFullToken, setShowFullToken] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const { data: proposal, isLoading, isError } = useGetProposal(proposalId, !!proposalId);
  const { data: logsData } = useGetProposalLogs(proposalId, !!proposalId);
  const documentBranding = useSalesDocumentBranding();
  const { data: installmentsData } = useListInstallments(
    { proposalId, limit: 50 },
    !!proposalId && proposal?.status === "approved",
  );
  const proposalInstallments = installmentsData?.installments ?? [];
  const hasInstallmentSchedule = proposalInstallments.length > 0;
  const logs = logsData?.logs ?? [];

  const sendProposal    = useSendProposal();
  const approveProposal = useApproveProposal();
  const declineProposal = useDeclineProposal();
  const counterProposal = useCounterProposal();
  const reviseProposal  = useReviseProposal();
  const deleteProposal  = useDeleteProposal();
  const updateProposal  = useUpdateProposal();

  const handleStatusChange = async (next: ProposalStatus) => {
    if (!proposal || next === proposal.status) return;
    try {
      await updateProposal.mutateAsync({ id: proposalId, status: next });
      toast.success("Status updated");
    } catch (err) {
      toastApiError(err, "Failed to update status");
    }
  };

  const runAction = async (
    action: "send" | "approve" | "decline" | "counter" | "revise",
    mutate: { mutateAsync: (vars: { id: number; [k: string]: unknown }) => Promise<unknown> },
    extra?: Record<string, unknown>,
  ) => {
    try {
      const result = await mutate.mutateAsync({ id: proposalId, ...extra });
      const labels: Record<string, string> = {
        send: "sent", approve: "approved", decline: "declined",
        counter: "moved to counter offer", revise: "marked for revision",
      };
      if (action === "send") {
        const emailSent = (result as { emailSent?: boolean })?.emailSent;
        const to = (result as { sentToEmail?: string })?.sentToEmail;
        toast.success("Proposal sent", {
          description: emailSent ? `Email delivered to ${to}` : "Status updated — no email on file.",
        });
      } else {
        toast.success(`Proposal ${labels[action]}`);
      }
    } catch (err) {
      toastApiError(err, `Failed to ${action} proposal`);
    }
  };

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !proposal) {
    return (
      <SalesEmptyState
        title="Proposal not found"
        description={`No proposal with ID #${proposalId} exists.`}
        actionLabel="Back to proposals"
        onAction={() => window.history.back()}
      />
    );
  }

  const { grossSubtotal, grossTax, discountAmount, finalTotal, adjustmentDelta } =
    resolveProposalTotal(proposal);

  const clientName    = proposal.lead?.name ?? proposal.customer?.contactPerson ?? (proposal.leadId ? `Lead #${proposal.leadId}` : proposal.customerId ? `Customer #${proposal.customerId}` : "—");
  const clientEmail   = proposal.lead?.email   ?? proposal.customer?.email   ?? null;
  const clientPhone   = proposal.lead?.phone   ?? proposal.customer?.phone   ?? null;
  const clientCompany = proposal.lead?.company ?? proposal.customer?.companyName ?? null;

  const shareUrl = proposal.viewToken
    ? `${window.location.origin}/proposal/${proposal.id}/${proposal.viewToken}`
    : null;

  const uniqueViews = logs.filter((l) => l.event === "viewed").length;
  const uniqueIps   = new Set(logs.filter((l) => l.event === "viewed" && l.ip).map((l) => l.ip)).size;

  const isActionable       = ["draft", "revised", "counter_offer"].includes(proposal.status);
  const isDecisionPending  = ["sent", "seen"].includes(proposal.status);
  const isPastValidity     = !!(proposal.validUntil && new Date(proposal.validUntil) < new Date());

  const handleDelete = async () => {
    try {
      await deleteProposal.mutateAsync(proposalId);
      toast.success("Proposal deleted");
      navigate("/sales/proposals");
    } catch (err) {
      toastApiError(err, "Failed to delete proposal");
      setDeleteConfirm(false);
    }
  };

  const statusConfig = {
    sent: { label: "Awaiting Response", chip: `${PDF.blue}15`, text: PDF.blue, dot: PDF.blue },
    seen: { label: "Awaiting Response", chip: `${PDF.blue}15`, text: PDF.blue, dot: PDF.blue },
    approved: { label: "Accepted", chip: "#ECFDF5", text: PDF.green, dot: PDF.green },
    declined: { label: "Declined", chip: "#FEF2F2", text: PDF.red, dot: PDF.red },
    counter_offer: { label: "Counter Offer Sent", chip: "#FFFBEB", text: PDF.orange, dot: PDF.orange },
    expired: { label: "Expired", chip: "#F9FAFB", text: PDF.muted, dot: PDF.subtle },
    draft: { label: "Draft", chip: "#F9FAFB", text: PDF.muted, dot: PDF.subtle },
    revised: { label: "Revised", chip: "#EEF2FF", text: "#4338CA", dot: "#4338CA" },
  } as const;
  const sCfg = statusConfig[proposal.status as keyof typeof statusConfig] ?? statusConfig.sent;
  const pdfCurrentStatus = ["approved", "declined", "counter_offer"].includes(proposal.status)
    ? (proposal.status as "approved" | "declined" | "counter_offer")
    : null;
  const proposalForPdf = {
    ...proposal,
    companySettings: {
      companyName: documentBranding.companyName,
      logoUrl: documentBranding.logoUrl,
      sealUrl: documentBranding.sealUrl,
      address: documentBranding.address,
    },
  } as PublicProposal;

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !proposal) {
      toast.error("Proposal document is not ready for PDF export");
      return;
    }
    setDownloading(true);
    try {
      await downloadElementAsPdf(pdfRef.current, proposal.number, { widthPx: 794 });
      toast.success("Proposal PDF downloaded");
    } catch (err) {
      console.error("Proposal PDF export failed:", err);
      toast.error("Failed to generate proposal PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
    <PortalPageShell>
      {/* ── Delete confirm dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Delete proposal?</p>
                <p className="text-xs mt-1 leading-relaxed text-muted-foreground">
                  Permanently deletes <strong>{proposal.number}</strong> and its full audit history. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 h-10"
                disabled={deleteProposal.isPending}
                onClick={handleDelete}
              >
                {deleteProposal.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <SalesPageHeader
        title={proposal.title}
        description={proposal.number}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Proposals", href: "/sales/proposals" },
          { label: proposal.number },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link href="/sales/proposals"><ArrowLeft className="h-3.5 w-3.5" />Back</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={downloading}
              onClick={handleDownloadPdf}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>
            {["draft", "revised", "declined", "expired"].includes(proposal.status) && (
              <Button
                variant="outline" size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            )}
            {isActionable && (
              <Button size="sm" className="h-8 gap-1.5" disabled={sendProposal.isPending} onClick={() => runAction("send", sendProposal)}>
                <Send className="h-3.5 w-3.5" />Send proposal
              </Button>
            )}
            {isDecisionPending && (
              <>
                <Button size="sm" className="h-8 gap-1.5" disabled={approveProposal.isPending} onClick={() => runAction("approve", approveProposal)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Mark approved
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={declineProposal.isPending} onClick={() => runAction("decline", declineProposal)}>
                  <XCircle className="h-3.5 w-3.5" />Decline
                </Button>
              </>
            )}
            {(proposal.status === "declined" || proposal.status === "counter_offer") && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={reviseProposal.isPending} onClick={() => runAction("revise", reviseProposal)}>
                <RefreshCw className="h-3.5 w-3.5" />Revise &amp; resend
              </Button>
            )}
            {proposal.status === "approved" && (
              <>
                {!hasInstallmentSchedule && proposal.customerId && (
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => setScheduleOpen(true)}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    Create payment schedule
                  </Button>
                )}
                {hasInstallmentSchedule && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                    <Link href={`/sales/installments?proposalId=${proposal.id}`}>View installments</Link>
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      {/* ── Status strip ── */}
      <div className="flex flex-wrap items-center gap-2 -mt-1">
        <Select
          value={proposal.status}
          onValueChange={(v) => handleStatusChange(v as ProposalStatus)}
          disabled={updateProposal.isPending}
        >
          <SelectTrigger className="h-7 w-auto gap-1 border-dashed px-2 text-xs shadow-none">
            <SelectValue>
              <SalesStatusBadge variant="proposal" value={proposal.status} className="border-0" />
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {PROPOSAL_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {proposal.validUntil && (
          <span className={`text-xs font-medium ${isPastValidity ? "text-red-500" : "text-muted-foreground"}`}>
            Valid until {format(new Date(proposal.validUntil), "MMM d, yyyy")}
            {isPastValidity && " · expired"}
          </span>
        )}
        {proposal.assignedToUser && <ExecutiveAvatar name={proposal.assignedToUser.name} />}
        <span className="text-xs text-muted-foreground">Rev. v{proposal.revision}</span>
        {uniqueViews > 0 && (
          <Badge variant="secondary" className="text-[10px] gap-1 h-5">
            <Eye className="h-3 w-3" />{uniqueViews} {uniqueViews === 1 ? "view" : "views"} · {uniqueIps} {uniqueIps === 1 ? "IP" : "IPs"}
          </Badge>
        )}
      </div>

      {/* ── Alert banners ── */}
      {proposal.status === "counter_offer" && proposal.counterOfferNote && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5 flex gap-3">
          <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-bold mb-1 text-amber-800 dark:text-amber-200">Client counter offer</p>
            <p className="text-sm text-amber-900/90 dark:text-amber-100/90">{proposal.counterOfferNote}</p>
          </div>
        </div>
      )}
      {proposal.status === "declined" && proposal.declinedReason && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 flex gap-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-destructive" />
          <div>
            <p className="text-xs font-bold mb-1 text-destructive">Declined — reason from client</p>
            <p className="text-sm text-destructive/90">{proposal.declinedReason}</p>
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <CmsKpiGrid
        columns={4}
        items={[
          {
            title: "Proposal total",
            value: formatCurrency(finalTotal),
            icon: TrendingUp,
            accent: "default",
          },
          {
            title: "Client opens",
            value: String(uniqueViews),
            hint: uniqueViews > 0 ? `${uniqueIps} unique ${uniqueIps === 1 ? "IP" : "IPs"}` : "Not yet opened",
            icon: Eye,
            accent: "violet",
          },
          {
            title: "Items",
            value: String(proposal.items.length),
            icon: FileText,
            accent: "default",
          },
          {
            title: "Revision",
            value: `v${proposal.revision}`,
            icon: History,
            accent: "amber",
          },
        ]}
      />

      {proposal.status === "approved" && !proposal.customerId && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5 flex gap-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-bold mb-1 text-amber-800 dark:text-amber-200">Customer required for billing</p>
            <p className="text-sm text-amber-900/90 dark:text-amber-100/90">
              Convert the linked lead to a customer before creating a payment schedule.
            </p>
          </div>
        </div>
      )}

      {proposal.status === "approved" && hasInstallmentSchedule && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">Payment schedule</p>
              <p className="text-xs text-muted-foreground">
                {proposalInstallments.length} milestone{proposalInstallments.length === 1 ? "" : "s"} · receive payment on each when due
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-8" asChild>
              <Link href={`/sales/installments?proposalId=${proposal.id}`}>Manage</Link>
            </Button>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {proposalInstallments.map((inst) => (
              <Link
                key={inst.id}
                href={`/sales/installments/${inst.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  {formatInstallmentSequence(inst.sequenceNumber, inst.sequenceTotal) && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {formatInstallmentSequence(inst.sequenceNumber, inst.sequenceTotal)}
                    </p>
                  )}
                  <p className="font-semibold truncate text-foreground">{inst.name}</p>
                  <p className="text-muted-foreground">
                    Due {format(new Date(inst.dueDate), "MMM d, yyyy")}
                    {inst.invoiceId ? " · Invoice linked" : " · No invoice yet"}
                  </p>
                </div>
                <span className="font-bold tabular-nums shrink-0 text-foreground">{formatCurrency(inst.dueAmount)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Approval evidence banner ── */}
      {proposal.status === "approved" && (proposal.clientSignature || proposal.approvalNote) && (
        <div className="rounded-2xl overflow-hidden bg-card border-2 border-green-500/30">
          <div className="flex items-center gap-3 border-b border-green-500/20 bg-green-500/10 px-6 py-4">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-600">
              <CheckCircle2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800 dark:text-green-200">Client Acceptance on Record</p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Signed {proposal.approvedAt ? format(new Date(proposal.approvedAt), "dd MMM yyyy 'at' h:mm a") : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-green-500/20">
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-green-700 dark:text-green-300">Client Note</p>
              {proposal.approvalNote
                ? <p className="text-sm leading-relaxed text-foreground">{proposal.approvalNote}</p>
                : <p className="text-xs italic text-muted-foreground">No note provided</p>
              }
            </div>
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-green-700 dark:text-green-300">Digital Signature</p>
              {proposal.clientSignature
                ? (
                  <div className="rounded-xl overflow-hidden border border-border bg-muted/40 max-w-[300px]">
                    <img
                      src={proposal.clientSignature}
                      alt="Client digital signature"
                      className="w-full h-28 object-contain p-2 dark:invert dark:mix-blend-screen"
                    />
                    <div className="border-t border-border px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">
                        Electronically signed · {proposal.approvedAt ? format(new Date(proposal.approvedAt), "dd MMM yyyy") : ""}
                      </p>
                    </div>
                  </div>
                )
                : <p className="text-xs italic text-muted-foreground">No signature captured</p>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* ══ LEFT COLUMN ══ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Line items */}
          <div className="rounded-2xl overflow-hidden border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-6 py-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Line Items</h3>
              <Badge variant="secondary" className="ml-auto text-[10px] h-5">{proposal.items.length} item{proposal.items.length !== 1 ? "s" : ""}</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-center py-3 px-5 text-[10px] font-black uppercase tracking-widest w-12 text-muted-foreground">#</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-foreground">Item</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qty</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rate</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tax</th>
                    <th className="text-right py-3 px-6 text-[10px] font-black uppercase tracking-widest text-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item, idx) => {
                    const line    = item.quantity * item.unitPrice;
                    const lineTax = line * (item.taxPercent / 100);
                    return (
                      <tr
                        key={item.itemId ?? idx}
                        className={cn(
                          "border-b border-border",
                          idx % 2 === 0 ? "bg-card" : "bg-muted/30",
                        )}
                      >
                        <td className="text-center py-4 px-5 text-xs font-bold tabular-nums align-top pt-[18px] text-primary">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-sm text-foreground">
                            {item.name || <span className="text-muted-foreground font-normal">—</span>}
                          </p>
                          {item.description && (
                            <p className="text-xs mt-1 leading-relaxed text-muted-foreground">{item.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums align-top pt-[18px] text-sm text-muted-foreground">{item.quantity}</td>
                        <td className="py-4 px-4 text-right tabular-nums align-top pt-[18px] text-sm text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-4 px-4 text-right align-top pt-[18px] text-xs text-muted-foreground/80">
                          {item.taxPercent > 0 ? `GST ${item.taxPercent}%` : "—"}
                        </td>
                        <td className="py-4 px-6 text-right font-bold tabular-nums align-top pt-[18px] text-foreground">
                          {formatCurrency(line + lineTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-6 py-5 flex justify-end">
              <div className="w-[280px]">
                <div className="space-y-2 pb-3 border-b border-border">
                  <TRow label="Subtotal" val={formatCurrency(grossSubtotal)} />
                  <TRow label="Tax (GST)" val={formatCurrency(grossTax)} />
                  {proposal.discount > 0 && (
                    <TRow
                      label={`Discount (${formatDiscountPercent(proposal.discount)}%)`}
                      val={`− ${formatCurrency(discountAmount)}`}
                      valClassName="text-orange-600 dark:text-orange-400"
                    />
                  )}
                  {adjustmentDelta !== 0 && (
                    <TRow
                      label={proposal.adjustedTotal != null ? "Custom total" : "Amount adjustment"}
                      val={`${adjustmentDelta > 0 ? "+ " : "− "}${formatCurrency(Math.abs(adjustmentDelta))}`}
                      valClassName="text-primary"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 rounded-xl bg-muted px-4 py-3.5">
                  <span className="text-sm font-semibold text-muted-foreground">Total</span>
                  <span className="text-lg font-black tabular-nums text-orange-600 dark:text-orange-400">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal details */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-6 py-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Proposal Details</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Number",      value: proposal.number,        mono: true },
                  { label: "Revision",    value: `v${proposal.revision}` },
                  { label: "Status",      node: (
                    <Select
                      value={proposal.status}
                      onValueChange={(v) => handleStatusChange(v as ProposalStatus)}
                      disabled={updateProposal.isPending}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 border-dashed px-2 text-xs shadow-none">
                        <SelectValue>
                          <SalesStatusBadge variant="proposal" value={proposal.status} className="border-0" />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        {PROPOSAL_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) },
                  { label: "Assigned to", value: proposal.assignedToUser?.name ?? "—" },
                  { label: "Created",     value: formatSalesDateTime(proposal.createdAt) },
                  proposal.sentAt    ? { label: "Sent",        value: format(new Date(proposal.sentAt),    "dd MMM yyyy") } : null,
                  proposal.validUntil ? { label: "Valid until", value: format(new Date(proposal.validUntil), "dd MMM yyyy"), warn: isPastValidity } : null,
                  proposal.seenAt    ? { label: "First opened", value: format(new Date(proposal.seenAt),   "dd MMM yyyy") } : null,
                  proposal.approvedAt? { label: "Approved",   value: format(new Date(proposal.approvedAt),"dd MMM yyyy") } : null,
                ].filter(Boolean).map((row) => (
                  <div key={row!.label}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-primary">{row!.label}</p>
                    {row!.node
                      ? <div>{row!.node}</div>
                      : <p className={cn(
                          "text-sm font-semibold",
                          (row as { mono?: boolean }).mono && "font-mono",
                          (row as { warn?: boolean }).warn
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-foreground",
                        )}>
                          {row!.value}
                        </p>
                    }
                  </div>
                ))}
              </div>

              {proposal.clientNote && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-primary">Client Note</p>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{proposal.clientNote}</p>
                    </div>
                  </div>
                </>
              )}

              {proposal.terms && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-primary">Terms &amp; Conditions</p>
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{proposal.terms}</p>
                    </div>
                  </div>
                </>
              )}

              {proposal.internalNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Shield className="h-3 w-3" />Internal Notes (staff only)
                    </p>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-amber-950 dark:text-amber-100">{proposal.internalNotes}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activity & audit */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-6 py-4">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Activity &amp; Audit Trail</h3>
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-[10px] h-5">{logs.length} events</Badge>
              )}
            </div>
            <div className="p-6 space-y-6">
              <div>
                <SectionLabel>Internal</SectionLabel>
                <div className="space-y-0">
                  {[
                    {
                      label: "Proposal created",
                      sub: `${proposal.number} · v${proposal.revision}`,
                      at: proposal.createdAt,
                      iconWrap: "bg-primary/10 text-primary",
                      labelClass: "text-primary",
                      icon: <FileText className="h-3 w-3" />,
                    },
                    proposal.sentAt ? {
                      label: "Proposal dispatched",
                      sub: proposal.sentToEmail ? `Email → ${proposal.sentToEmail}` : "Status updated",
                      at: proposal.sentAt,
                      iconWrap: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
                      labelClass: "text-sky-700 dark:text-sky-300",
                      icon: <Send className="h-3 w-3" />,
                    } : null,
                    proposal.approvedAt ? {
                      label: "Approved",
                      sub: formatDistanceToNow(new Date(proposal.approvedAt), { addSuffix: true }),
                      at: proposal.approvedAt,
                      iconWrap: "bg-green-500/10 text-green-700 dark:text-green-300",
                      labelClass: "text-green-700 dark:text-green-300",
                      icon: <CheckCircle2 className="h-3 w-3" />,
                    } : null,
                    proposal.declinedAt ? {
                      label: "Declined",
                      sub: proposal.declinedReason ? `Reason: ${proposal.declinedReason}` : undefined,
                      at: proposal.declinedAt,
                      iconWrap: "bg-destructive/10 text-destructive",
                      labelClass: "text-destructive",
                      icon: <XCircle className="h-3 w-3" />,
                    } : null,
                  ].filter(Boolean).map((ev, i, arr) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", ev!.iconWrap)}>
                          {ev!.icon}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="flex-1 w-px my-1 bg-border min-h-[20px]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn("text-xs font-semibold", ev!.labelClass)}>{ev!.label}</span>
                          <span className="text-[10px] flex-shrink-0 text-muted-foreground">
                            {format(new Date(ev!.at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        {ev!.sub && <p className="text-[10px] mt-0.5 text-muted-foreground">{ev!.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {logs.length > 0 && (
                <div className="border-t border-border pt-5">
                  <SectionLabel>Client Interactions ({logs.length})</SectionLabel>
                  <div className="space-y-0">
                    {logs.map((log, i) => {
                      const cfg = eventCfg(log.event);
                      return (
                        <div key={log.id} className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", cfg.bgClass)}>
                              <span className={cn("h-2.5 w-2.5 rounded-full", cfg.dotClass)} />
                            </div>
                            {i < logs.length - 1 && (
                              <div className="flex-1 w-px my-1 bg-border min-h-[20px]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="flex items-start justify-between gap-2">
                              <span className={cn("text-xs font-semibold", cfg.textClass)}>{cfg.label}</span>
                              <span className="text-[10px] flex-shrink-0 text-muted-foreground">
                                {format(new Date(log.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-0.5">
                              {log.ip && (
                                <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                                  <Globe className="h-3 w-3" />{log.ip}
                                </span>
                              )}
                              {log.userAgent && (
                                <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                                  <Monitor className="h-3 w-3" />
                                  {/Mobile|Android|iPhone|iPad/i.test(log.userAgent) ? "Mobile" : "Desktop"}
                                </span>
                              )}
                            </div>
                            {log.reason && (
                              <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
                                <p className="text-xs text-destructive"><span className="font-semibold">Reason: </span>{log.reason}</p>
                              </div>
                            )}
                            {log.note && (
                              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                                <p className="text-xs text-amber-800 dark:text-amber-200"><span className="font-semibold">Counter note: </span>{log.note}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {logs.length === 0 && (
                <p className="text-xs text-center py-4 text-muted-foreground">
                  {proposal.sentAt
                    ? "Proposal sent · waiting for client to open the link."
                    : "No client interactions yet — send the proposal to start tracking."}
                </p>
              )}
            </div>
          </div>

          {/* Revision history */}
          {proposal.revision > 1 && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-6 py-4">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Revision History</h3>
              </div>
              <div className="p-6 space-y-2">
                {Array.from({ length: proposal.revision }, (_, i) => {
                  const isCurrent = i + 1 === proposal.revision;
                  return (
                    <div
                      key={i + 1}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3",
                        isCurrent
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-muted/20",
                      )}
                    >
                      <span className={cn("text-sm font-semibold", isCurrent ? "text-primary" : "text-foreground")}>
                        Revision {i + 1}
                      </span>
                      <span className={cn("text-xs font-medium", isCurrent ? "text-primary" : "text-muted-foreground")}>
                        {isCurrent ? "Current version" : "Previous revision"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div className="space-y-4">

          {/* Client card */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Client</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 bg-primary/10 text-primary">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-foreground">{clientName}</p>
                  {clientCompany && (
                    <p className="text-xs flex items-center gap-1 truncate text-muted-foreground">
                      <Building2 className="h-3 w-3 flex-shrink-0" />{clientCompany}
                    </p>
                  )}
                </div>
              </div>
              {clientEmail && (
                <a
                  href={`mailto:${clientEmail}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:underline hover:text-foreground"
                >
                  <AtSign className="h-3.5 w-3.5 flex-shrink-0" />
                  {clientEmail}
                </a>
              )}
              {clientPhone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  {clientPhone}
                </div>
              )}
              {proposal.lead && (
                <Button variant="outline" size="sm" className="w-full h-9 text-xs mt-1" asChild>
                  <Link href={`/sales/leads/${proposal.lead.id}`}>View lead profile</Link>
                </Button>
              )}
              {proposal.customer && (
                <Button variant="outline" size="sm" className="w-full h-9 text-xs mt-1" asChild>
                  <Link href={`/sales/customers/${proposal.customer.id}`}>View customer profile</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Share link */}
          {shareUrl && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Link2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Client Link</h3>
                {uniqueViews > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 gap-1">
                    <Eye className="h-3 w-3" />{uniqueViews} opens
                  </Badge>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div
                  className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-[10px] font-mono text-muted-foreground cursor-pointer select-all break-all"
                  onClick={() => setShowFullToken((v) => !v)}
                >
                  {showFullToken
                    ? shareUrl
                    : `${window.location.origin}/proposal/${proposal.id}/••••••••…`}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5"
                    onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast.success("Link copied"))}
                  >
                    <Copy className="h-3.5 w-3.5" />Copy link
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 px-3" asChild>
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>

                {uniqueViews > 0 && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-violet-700 dark:text-violet-300">
                      <Eye className="h-3 w-3" />View Analytics
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-violet-700 dark:text-violet-300">
                      <span>Total opens</span>
                      <span className="text-right font-bold text-violet-900 dark:text-violet-100">{uniqueViews}</span>
                      <span>Unique IPs</span>
                      <span className="text-right font-bold text-violet-900 dark:text-violet-100">{uniqueIps}</span>
                      {proposal.seenAt && (
                        <>
                          <span>First seen</span>
                          <span className="text-right font-medium text-violet-900 dark:text-violet-100">
                            {format(new Date(proposal.seenAt), "MMM d, h:mm a")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {proposal.status === "sent" && !proposal.seenAt && (
                  <p className="text-[10px] flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />Awaiting client to open the link
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Discussion */}
          <StaffDiscussionCard proposalId={proposalId} />
        </div>
      </div>

      <div
        ref={pdfRef}
        className="fixed top-0 w-[794px] pointer-events-none"
        style={{ left: -10000 }}
        aria-hidden
      >
        <ProposalDocument
          proposal={proposalForPdf}
          currentStatus={pdfCurrentStatus}
          statusChip={sCfg}
          branding={documentBranding}
          forPdf
        />
      </div>
    </PortalPageShell>
    <ProposalFormSheet open={editOpen} onOpenChange={setEditOpen} editId={proposal.id} />
    <InstallmentsFromProposalDialog
      open={scheduleOpen}
      onOpenChange={setScheduleOpen}
      proposal={proposal}
      proposalTotal={finalTotal}
    />
  </>
  );
}

/* ─── Staff discussion card ────────────────────────────────────────────────── */
function StaffDiscussionCard({ proposalId }: { proposalId: number }) {
  const { data, isLoading } = useProposalComments(proposalId, !!proposalId);
  const addComment = useAddStaffComment(proposalId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const comments = data?.comments ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    await addComment.mutateAsync({ content });
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Discussion</h3>
        {comments.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {comments.length}
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-3 overflow-y-auto max-h-72 pr-0.5">
          {isLoading ? (
            <p className="text-xs text-center py-6 text-muted-foreground">Loading…</p>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            comments.map((c: ProposalComment) => {
              const isStaff = c.authorType === "staff";
              return (
                <div key={c.id} className={`flex gap-2.5 ${isStaff ? "flex-row-reverse" : ""}`}>
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold",
                      isStaff ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {isStaff ? "S" : "C"}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[82%] ${isStaff ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] px-1 text-muted-foreground">
                      {isStaff ? c.authorName : "Client"} · {format(new Date(c.createdAt), "MMM d, h:mm a")}
                    </span>
                    <div
                      className={cn(
                        "px-3 py-2 text-xs leading-relaxed",
                        isStaff
                          ? "rounded-[14px_4px_14px_14px] bg-primary text-primary-foreground"
                          : "rounded-[4px_14px_14px_14px] border border-amber-500/20 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                      )}
                    >
                      {c.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-border pt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
            placeholder="Reply to client…"
            className="flex-1 h-9 rounded-xl border border-input bg-background px-3.5 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          <Button size="sm" className="h-9 px-3" onClick={handleSend} disabled={!text.trim() || addComment.isPending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function TRow({ label, val, valClassName }: { label: string; val: string; valClassName?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums text-foreground", valClassName)}>{val}</span>
    </div>
  );
}
