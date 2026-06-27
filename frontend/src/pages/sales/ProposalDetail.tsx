import { useState, useRef, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  ArrowLeft, Copy, ExternalLink, FileText, Globe, History,
  Link2, Mail, Monitor, Send, CheckCircle2, XCircle, Clock,
  AlertTriangle, MessageSquare, User, Building2, Phone, AtSign,
  RefreshCw, Eye, Shield, Pencil, Trash2, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  useGetProposal, useGetProposalLogs, useSendProposal,
  useApproveProposal, useDeclineProposal, useCounterProposal, useReviseProposal,
  useDeleteProposal, useProposalComments, useAddStaffComment,
  type ProposalComment, type ProposalLog,
} from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { resolveProposalTotal } from "@/modules/sales/utils";
import {
  SalesPageHeader, SalesStatusBadge, ExecutiveAvatar, SalesEmptyState,
} from "@/modules/sales/components";

/* ─── Design tokens (match public view palette) ───────────────────────────── */
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
  rowAlt:     "#F5F8FF",
};

/* ─── Audit event config ───────────────────────────────────────────────────── */
const EVENT_CFG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  viewed:        { label: "Client opened link",   dot: "#7C3AED", text: "#5B21B6", bg: "#EDE9FE" },
  approved:      { label: "Client accepted",      dot: P.green,   text: "#065F46", bg: "#ECFDF5" },
  declined:      { label: "Client declined",      dot: P.red,     text: "#991B1B", bg: "#FEF2F2" },
  counter_offer: { label: "Client counter offer", dot: P.orange,  text: "#92400E", bg: "#FFFBEB" },
};

function AuditEntry({ log }: { log: ProposalLog }) {
  const cfg = EVENT_CFG[log.event] ?? { label: log.event, dot: P.muted, text: P.muted, bg: "#F9FAFB" };
  const ua = log.userAgent ?? "";
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "Mobile" : /Windows|Macintosh|Linux/i.test(ua) ? "Desktop" : "Unknown";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: cfg.bg }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.dot }} />
        </div>
        <div className="flex-1 w-px mt-1" style={{ background: P.border }} />
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: cfg.text }}>{cfg.label}</span>
          <span className="text-[10px] flex-shrink-0" style={{ color: P.subtle }}>
            {format(new Date(log.createdAt), "MMM d, h:mm a")}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          {log.ip && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: P.muted }}>
              <Globe className="h-3 w-3" />{log.ip}
            </span>
          )}
          {log.userAgent && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: P.muted }}>
              <Monitor className="h-3 w-3" />{device}
            </span>
          )}
        </div>
        {log.reason && (
          <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "#FEF2F2", border: `1px solid #FECACA` }}>
            <p className="text-xs" style={{ color: "#991B1B" }}><span className="font-semibold">Reason: </span>{log.reason}</p>
          </div>
        )}
        {log.note && (
          <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "#FFFBEB", border: `1px solid #FDE68A` }}>
            <p className="text-xs" style={{ color: "#92400E" }}><span className="font-semibold">Counter note: </span>{log.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section label helper ─────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: P.blue }}>
      {children}
    </p>
  );
}

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = P.blue }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl p-4 space-y-1.5" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
          {icon}
        </span>
        <span className="text-xs" style={{ color: P.muted }}>{label}</span>
      </div>
      <p className="text-xl font-black tabular-nums" style={{ color: P.dark }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: P.subtle }}>{sub}</p>}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────────── */
export default function ProposalDetail() {
  const [, params] = useRoute("/sales/proposals/:id");
  const [, navigate] = useLocation();
  const proposalId = Number(params?.id);
  const [showFullToken, setShowFullToken] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: proposal, isLoading, isError } = useGetProposal(proposalId, !!proposalId);
  const { data: logsData } = useGetProposalLogs(proposalId, !!proposalId);
  const logs = logsData?.logs ?? [];

  const sendProposal    = useSendProposal();
  const approveProposal = useApproveProposal();
  const declineProposal = useDeclineProposal();
  const counterProposal = useCounterProposal();
  const reviseProposal  = useReviseProposal();
  const deleteProposal  = useDeleteProposal();

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

  const { subtotal, tax, calculated, finalTotal, adjustmentDelta } = resolveProposalTotal(proposal);

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

  return (
    <PortalPageShell>
      {/* ── Delete confirm dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,25,40,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-5" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FEF2F2" }}>
                <Trash2 className="h-5 w-5" style={{ color: P.red }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: P.dark }}>Delete proposal?</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: P.muted }}>
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
                className="flex-1 h-10"
                style={{ background: P.red }}
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
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link href={`/sales/proposals/create?editId=${proposal.id}`}><Pencil className="h-3.5 w-3.5" />Edit</Link>
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
              <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                <Link href="/sales/installments">View installments</Link>
              </Button>
            )}
          </>
        }
      />

      {/* ── Status strip ── */}
      <div className="flex flex-wrap items-center gap-2 -mt-1">
        <SalesStatusBadge variant="proposal" value={proposal.status} />
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
        <div className="rounded-xl px-4 py-3.5 flex gap-3" style={{ background: "#FFFBEB", border: `1px solid #FDE68A` }}>
          <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: P.orange }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "#92400E" }}>Client counter offer</p>
            <p className="text-sm" style={{ color: "#78350F" }}>{proposal.counterOfferNote}</p>
          </div>
        </div>
      )}
      {proposal.status === "declined" && proposal.declinedReason && (
        <div className="rounded-xl px-4 py-3.5 flex gap-3" style={{ background: "#FEF2F2", border: `1px solid #FECACA` }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: P.red }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "#991B1B" }}>Declined — reason from client</p>
            <p className="text-sm" style={{ color: "#7F1D1D" }}>{proposal.declinedReason}</p>
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Proposal total"
          value={formatCurrency(finalTotal)}
          color={P.blue}
        />
        <StatCard
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Client opens"
          value={String(uniqueViews)}
          sub={uniqueViews > 0 ? `${uniqueIps} unique ${uniqueIps === 1 ? "IP" : "IPs"}` : "Not yet opened"}
          color="#7C3AED"
        />
        <StatCard
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Items"
          value={String(proposal.items.length)}
          color={P.muted}
        />
        <StatCard
          icon={<History className="h-3.5 w-3.5" />}
          label="Revision"
          value={`v${proposal.revision}`}
          color={P.orange}
        />
      </div>

      {/* ── Approval evidence banner ── */}
      {proposal.status === "approved" && (proposal.clientSignature || proposal.approvalNote) && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `2px solid #BBF7D0` }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4" style={{ background: "#ECFDF5", borderBottom: `1px solid #BBF7D0` }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: P.green }}>
              <CheckCircle2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#065F46" }}>Client Acceptance on Record</p>
              <p className="text-xs" style={{ color: "#047857" }}>
                Signed {proposal.approvedAt ? format(new Date(proposal.approvedAt), "dd MMM yyyy 'at' h:mm a") : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "#BBF7D0" }}>
            {/* Note */}
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: P.green }}>Client Note</p>
              {proposal.approvalNote
                ? <p className="text-sm leading-relaxed" style={{ color: P.dark }}>{proposal.approvalNote}</p>
                : <p className="text-xs italic" style={{ color: P.subtle }}>No note provided</p>
              }
            </div>
            {/* Signature */}
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: P.green }}>Digital Signature</p>
              {proposal.clientSignature
                ? (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#F9FAFB", border: `1px solid ${P.border}`, maxWidth: 300 }}>
                    <img
                      src={proposal.clientSignature}
                      alt="Client digital signature"
                      className="w-full h-28 object-contain p-2"
                      style={{ mixBlendMode: "multiply" }}
                    />
                    <div className="px-3 py-2" style={{ borderTop: `1px solid ${P.border}` }}>
                      <p className="text-[10px]" style={{ color: P.subtle }}>
                        Electronically signed · {proposal.approvedAt ? format(new Date(proposal.approvedAt), "dd MMM yyyy") : ""}
                      </p>
                    </div>
                  </div>
                )
                : <p className="text-xs italic" style={{ color: P.subtle }}>No signature captured</p>
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
          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <FileText className="h-4 w-4" style={{ color: P.blue }} />
              <h3 className="text-sm font-bold" style={{ color: P.dark }}>Line Items</h3>
              <Badge variant="secondary" className="ml-auto text-[10px] h-5">{proposal.items.length} item{proposal.items.length !== 1 ? "s" : ""}</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: P.dark }}>
                    <th className="text-center py-3 px-5 text-[10px] font-black uppercase tracking-widest w-12" style={{ color: "#6B7280" }}>#</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#fff" }}>Item</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Qty</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Rate</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Tax</th>
                    <th className="text-right py-3 px-6 text-[10px] font-black uppercase tracking-widest" style={{ color: "#fff" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item, idx) => {
                    const line    = item.quantity * item.unitPrice;
                    const lineTax = line * (item.taxPercent / 100);
                    return (
                      <tr
                        key={item.itemId ?? idx}
                        style={{ background: idx % 2 === 0 ? "#fff" : P.rowAlt, borderBottom: `1px solid ${P.border}` }}
                      >
                        <td className="text-center py-4 px-5 text-xs font-bold tabular-nums align-top pt-[18px]" style={{ color: P.blue }}>
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-sm" style={{ color: P.dark }}>
                            {item.name || <span style={{ color: P.subtle, fontWeight: 400 }}>—</span>}
                          </p>
                          {item.description && (
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: P.muted }}>{item.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums align-top pt-[18px] text-sm" style={{ color: P.muted }}>{item.quantity}</td>
                        <td className="py-4 px-4 text-right tabular-nums align-top pt-[18px] text-sm" style={{ color: P.muted }}>{formatCurrency(item.unitPrice)}</td>
                        <td className="py-4 px-4 text-right align-top pt-[18px] text-xs" style={{ color: P.subtle }}>
                          {item.taxPercent > 0 ? `GST ${item.taxPercent}%` : "—"}
                        </td>
                        <td className="py-4 px-6 text-right font-bold tabular-nums align-top pt-[18px]" style={{ color: P.dark }}>
                          {formatCurrency(line + lineTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-5 flex justify-end" style={{ borderTop: `1px solid ${P.border}` }}>
              <div style={{ width: 280 }}>
                <div className="space-y-2 pb-3" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <TRow label="Subtotal" val={formatCurrency(subtotal)} />
                  <TRow label="Tax (GST)" val={formatCurrency(tax)} />
                  {proposal.discount > 0 && (
                    <TRow label={`Discount (${proposal.discount}%)`} val={`− ${formatCurrency(calculated - (subtotal + tax))}`} valColor={P.orange} />
                  )}
                  {adjustmentDelta !== 0 && (
                    <TRow
                      label={proposal.adjustedTotal != null ? "Custom total" : "Amount adjustment"}
                      val={`${adjustmentDelta > 0 ? "+ " : "− "}${formatCurrency(Math.abs(adjustmentDelta))}`}
                      valColor={P.blue}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 px-4 py-3.5 rounded-xl" style={{ background: P.dark }}>
                  <span className="text-sm font-semibold" style={{ color: "#9CA3AF" }}>Total</span>
                  <span className="text-lg font-black tabular-nums" style={{ color: P.orange }}>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal details */}
          <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <FileText className="h-4 w-4" style={{ color: P.blue }} />
              <h3 className="text-sm font-bold" style={{ color: P.dark }}>Proposal Details</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Number",      value: proposal.number,        mono: true },
                  { label: "Revision",    value: `v${proposal.revision}` },
                  { label: "Status",      node: <SalesStatusBadge variant="proposal" value={proposal.status} /> },
                  { label: "Assigned to", value: proposal.assignedToUser?.name ?? "—" },
                  { label: "Created",     value: format(new Date(proposal.createdAt), "dd MMM yyyy") },
                  proposal.sentAt    ? { label: "Sent",        value: format(new Date(proposal.sentAt),    "dd MMM yyyy") } : null,
                  proposal.validUntil ? { label: "Valid until", value: format(new Date(proposal.validUntil), "dd MMM yyyy"), warn: isPastValidity } : null,
                  proposal.seenAt    ? { label: "First opened", value: format(new Date(proposal.seenAt),   "dd MMM yyyy") } : null,
                  proposal.approvedAt? { label: "Approved",   value: format(new Date(proposal.approvedAt),"dd MMM yyyy") } : null,
                ].filter(Boolean).map((row) => (
                  <div key={row!.label}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: P.blue }}>{row!.label}</p>
                    {row!.node
                      ? <div>{row!.node}</div>
                      : <p className={`text-sm font-semibold ${(row as { mono?: boolean }).mono ? "font-mono" : ""}`} style={{ color: (row as { warn?: boolean }).warn ? P.orange : P.dark }}>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: P.blue }}>Client Note</p>
                    <div className="rounded-xl px-4 py-3" style={{ background: P.blueLight, border: `1px solid ${P.blueBorder}` }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: P.dark }}>{proposal.clientNote}</p>
                    </div>
                  </div>
                </>
              )}

              {proposal.terms && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: P.blue }}>Terms &amp; Conditions</p>
                    <div className="rounded-xl px-4 py-3" style={{ background: "#F9FAFB", border: `1px solid ${P.border}` }}>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: P.muted }}>{proposal.terms}</p>
                    </div>
                  </div>
                </>
              )}

              {proposal.internalNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: P.orange }}>
                      <Shield className="h-3 w-3" />Internal Notes (staff only)
                    </p>
                    <div className="rounded-xl px-4 py-3" style={{ background: "#FFFBEB", border: `1px solid #FDE68A` }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#78350F" }}>{proposal.internalNotes}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activity & audit */}
          <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <Shield className="h-4 w-4" style={{ color: P.blue }} />
              <h3 className="text-sm font-bold" style={{ color: P.dark }}>Activity &amp; Audit Trail</h3>
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-[10px] h-5">{logs.length} events</Badge>
              )}
            </div>
            <div className="p-6 space-y-6">
              {/* Internal timeline */}
              <div>
                <SectionLabel>Internal</SectionLabel>
                <div className="space-y-0">
                  {[
                    {
                      label: "Proposal created",
                      sub: `${proposal.number} · v${proposal.revision}`,
                      at: proposal.createdAt,
                      dot: P.blue, text: "#1E3A8A", bg: P.blueLight,
                      icon: <FileText className="h-3 w-3" />,
                    },
                    proposal.sentAt ? {
                      label: "Proposal dispatched",
                      sub: proposal.sentToEmail ? `Email → ${proposal.sentToEmail}` : "Status updated",
                      at: proposal.sentAt,
                      dot: "#0284C7", text: "#075985", bg: "#E0F2FE",
                      icon: <Send className="h-3 w-3" />,
                    } : null,
                    proposal.approvedAt ? {
                      label: "Approved",
                      sub: formatDistanceToNow(new Date(proposal.approvedAt), { addSuffix: true }),
                      at: proposal.approvedAt,
                      dot: P.green, text: "#065F46", bg: "#ECFDF5",
                      icon: <CheckCircle2 className="h-3 w-3" />,
                    } : null,
                    proposal.declinedAt ? {
                      label: "Declined",
                      sub: proposal.declinedReason ? `Reason: ${proposal.declinedReason}` : undefined,
                      at: proposal.declinedAt,
                      dot: P.red, text: "#991B1B", bg: "#FEF2F2",
                      icon: <XCircle className="h-3 w-3" />,
                    } : null,
                  ].filter(Boolean).map((ev, i, arr) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: ev!.bg, color: ev!.text }}>
                          {ev!.icon}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="flex-1 w-px my-1" style={{ background: P.border, minHeight: 20 }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold" style={{ color: ev!.text }}>{ev!.label}</span>
                          <span className="text-[10px] flex-shrink-0" style={{ color: P.subtle }}>
                            {format(new Date(ev!.at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        {ev!.sub && <p className="text-[10px] mt-0.5" style={{ color: P.muted }}>{ev!.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client interaction logs */}
              {logs.length > 0 && (
                <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 20 }}>
                  <SectionLabel>Client Interactions ({logs.length})</SectionLabel>
                  <div className="space-y-0">
                    {logs.map((log, i) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: (EVENT_CFG[log.event] ?? EVENT_CFG.viewed).bg }}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: (EVENT_CFG[log.event] ?? EVENT_CFG.viewed).dot }} />
                          </div>
                          {i < logs.length - 1 && (
                            <div className="flex-1 w-px my-1" style={{ background: P.border, minHeight: 20 }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold" style={{ color: (EVENT_CFG[log.event] ?? EVENT_CFG.viewed).text }}>
                              {(EVENT_CFG[log.event] ?? { label: log.event }).label}
                            </span>
                            <span className="text-[10px] flex-shrink-0" style={{ color: P.subtle }}>
                              {format(new Date(log.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-0.5">
                            {log.ip && (
                              <span className="text-[10px] flex items-center gap-1" style={{ color: P.muted }}>
                                <Globe className="h-3 w-3" />{log.ip}
                              </span>
                            )}
                            {log.userAgent && (
                              <span className="text-[10px] flex items-center gap-1" style={{ color: P.muted }}>
                                <Monitor className="h-3 w-3" />
                                {/Mobile|Android|iPhone|iPad/i.test(log.userAgent) ? "Mobile" : "Desktop"}
                              </span>
                            )}
                          </div>
                          {log.reason && (
                            <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "#FEF2F2", border: `1px solid #FECACA` }}>
                              <p className="text-xs" style={{ color: "#991B1B" }}><span className="font-semibold">Reason: </span>{log.reason}</p>
                            </div>
                          )}
                          {log.note && (
                            <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "#FFFBEB", border: `1px solid #FDE68A` }}>
                              <p className="text-xs" style={{ color: "#92400E" }}><span className="font-semibold">Counter note: </span>{log.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {logs.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: P.subtle }}>
                  {proposal.sentAt
                    ? "Proposal sent · waiting for client to open the link."
                    : "No client interactions yet — send the proposal to start tracking."}
                </p>
              )}
            </div>
          </div>

          {/* Revision history */}
          {proposal.revision > 1 && (
            <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                <History className="h-4 w-4" style={{ color: P.blue }} />
                <h3 className="text-sm font-bold" style={{ color: P.dark }}>Revision History</h3>
              </div>
              <div className="p-6 space-y-2">
                {Array.from({ length: proposal.revision }, (_, i) => {
                  const isCurrent = i + 1 === proposal.revision;
                  return (
                    <div
                      key={i + 1}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{
                        background: isCurrent ? P.blueLight : "#F9FAFB",
                        border: `1px solid ${isCurrent ? P.blueBorder : P.border}`,
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: isCurrent ? P.blue : P.dark }}>
                        Revision {i + 1}
                      </span>
                      <span className="text-xs font-medium" style={{ color: isCurrent ? P.blue : P.muted }}>
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
          <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <User className="h-4 w-4" style={{ color: P.blue }} />
              <h3 className="text-sm font-bold" style={{ color: P.dark }}>Client</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: P.blueLight, color: P.blue }}
                >
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: P.dark }}>{clientName}</p>
                  {clientCompany && (
                    <p className="text-xs flex items-center gap-1 truncate" style={{ color: P.muted }}>
                      <Building2 className="h-3 w-3 flex-shrink-0" />{clientCompany}
                    </p>
                  )}
                </div>
              </div>
              {clientEmail && (
                <a
                  href={`mailto:${clientEmail}`}
                  className="flex items-center gap-2 text-xs transition-colors hover:underline"
                  style={{ color: P.muted }}
                >
                  <AtSign className="h-3.5 w-3.5 flex-shrink-0" style={{ color: P.subtle }} />
                  {clientEmail}
                </a>
              )}
              {clientPhone && (
                <div className="flex items-center gap-2 text-xs" style={{ color: P.muted }}>
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: P.subtle }} />
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
            <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                <Link2 className="h-4 w-4" style={{ color: P.blue }} />
                <h3 className="text-sm font-bold" style={{ color: P.dark }}>Client Link</h3>
                {uniqueViews > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 gap-1">
                    <Eye className="h-3 w-3" />{uniqueViews} opens
                  </Badge>
                )}
              </div>
              <div className="p-5 space-y-3">
                {/* Masked URL */}
                <div
                  className="rounded-xl px-3.5 py-2.5 text-[10px] font-mono cursor-pointer select-all break-all"
                  style={{ background: "#F9FAFB", border: `1px solid ${P.border}`, color: P.muted }}
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

                {/* Analytics */}
                {uniqueViews > 0 && (
                  <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "#F5F3FF", border: `1px solid #DDD6FE` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "#5B21B6" }}>
                      <Eye className="h-3 w-3" />View Analytics
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                      <span style={{ color: "#6D28D9" }}>Total opens</span>
                      <span className="text-right font-bold" style={{ color: "#4C1D95" }}>{uniqueViews}</span>
                      <span style={{ color: "#6D28D9" }}>Unique IPs</span>
                      <span className="text-right font-bold" style={{ color: "#4C1D95" }}>{uniqueIps}</span>
                      {proposal.seenAt && (
                        <>
                          <span style={{ color: "#6D28D9" }}>First seen</span>
                          <span className="text-right font-medium" style={{ color: "#4C1D95" }}>
                            {format(new Date(proposal.seenAt), "MMM d, h:mm a")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {proposal.status === "sent" && !proposal.seenAt && (
                  <p className="text-[10px] flex items-center gap-1.5" style={{ color: P.muted }}>
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
    </PortalPageShell>
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
    <div className="rounded-2xl" style={{ background: "#fff", border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
        <MessageSquare className="h-4 w-4" style={{ color: P.blue }} />
        <h3 className="text-sm font-bold" style={{ color: P.dark }}>Discussion</h3>
        {comments.length > 0 && (
          <span
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: P.blueLight, color: P.blue }}
          >
            {comments.length}
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        {/* Messages */}
        <div className="space-y-3 overflow-y-auto max-h-72 pr-0.5">
          {isLoading ? (
            <p className="text-xs text-center py-6" style={{ color: P.subtle }}>Loading…</p>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: P.blueLight }}>
                <MessageSquare className="h-4 w-4" style={{ color: P.blue }} />
              </div>
              <p className="text-xs" style={{ color: P.subtle }}>No messages yet</p>
            </div>
          ) : (
            comments.map((c: ProposalComment) => {
              const isStaff = c.authorType === "staff";
              return (
                <div key={c.id} className={`flex gap-2.5 ${isStaff ? "flex-row-reverse" : ""}`}>
                  <div
                    className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: isStaff ? P.blueLight : "#FFFBEB", color: isStaff ? P.blue : P.orange }}
                  >
                    {isStaff ? "S" : "C"}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[82%] ${isStaff ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] px-1" style={{ color: P.subtle }}>
                      {isStaff ? c.authorName : "Client"} · {format(new Date(c.createdAt), "MMM d, h:mm a")}
                    </span>
                    <div
                      className="px-3 py-2 text-xs leading-relaxed"
                      style={isStaff
                        ? { background: P.blue, color: "#fff", borderRadius: "14px 4px 14px 14px" }
                        : { background: "#FFFBEB", color: "#78350F", border: `1px solid #FDE68A`, borderRadius: "4px 14px 14px 14px" }
                      }
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

        {/* Input */}
        <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
            placeholder="Reply to client…"
            className="flex-1 h-9 rounded-xl px-3.5 text-xs outline-none transition-colors"
            style={{ border: `1.5px solid ${P.border}`, color: P.dark }}
            onFocus={(e) => e.target.style.borderColor = P.blue}
            onBlur={(e) => e.target.style.borderColor = P.border}
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
function TRow({ label, val, valColor }: { label: string; val: string; valColor?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: P.muted }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: valColor ?? P.dark }}>{val}</span>
    </div>
  );
}
