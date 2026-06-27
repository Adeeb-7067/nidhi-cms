import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { format } from "date-fns";
import SignaturePad from "signature_pad";
import {
  CheckCircle2, Clock, FileText, AlertCircle, XCircle,
  MessageSquare, Send, Building2, User, Phone, Mail, MapPin,
  ThumbsUp, ThumbsDown, ChevronRight, RotateCcw, PenLine,
} from "lucide-react";
import {
  useGetPublicProposal,
  usePublicApproveProposal,
  usePublicDeclineProposal,
  usePublicCounterProposal,
  usePublicProposalComments,
  useAddPublicComment,
} from "@/api/sales";
import { resolveProposalTotal, numberToWords } from "@/modules/sales/utils";
import { formatCurrency, COMPANY_BILLING } from "@/modules/sales/constants";

/* ─── Design tokens ────────────────────────────────────────────────────────── */
// SK Logo palette: deep royal blue + warm orange + deep green
const primary   = "#1A56DB";   // royal blue
const orange    = "#E8630A";   // warm orange (logo K)
const green     = "#057A55";   // accept green
const red       = "#C81E1E";   // decline red
const dark      = "#111928";   // near-black text
const muted     = "#6B7280";   // secondary text
const subtle    = "#9CA3AF";   // tertiary / labels
const pageBg    = "#F1F5F9";   // page background
const border    = "#E5E7EB";   // default border
const rowAlt    = "#F9FAFB";   // table alt row

type ActionState = "idle" | "approving" | "declining" | "countering" | "done";
type Tab = "summary" | "discussion";

/* ─── Shared Modal Shell ───────────────────────────────────────────────────── */
function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(17,25,40,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: "#fff", border: `1px solid ${border}` }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmApproveModal({ onConfirm, onCancel, isPending, clientName }: {
  onConfirm: (note: string, signature: string) => void;
  onCancel: () => void;
  isPending: boolean;
  clientName: string;
}) {
  const [note, setNote] = useState("");
  const [isSigned, setIsSigned] = useState(false);
  const [step, setStep] = useState<"details" | "sign">("details");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  /* Init signature pad when sign step mounts */
  useEffect(() => {
    if (step !== "sign" || !canvasRef.current) return;
    const canvas = canvasRef.current;

    /* Adjust for device pixel ratio so it looks crisp */
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      penColor: primary,
      backgroundColor: "rgba(0,0,0,0)",
      minWidth: 1.5,
      maxWidth: 3,
    });
    pad.addEventListener("endStroke", () => setIsSigned(!pad.isEmpty()));
    padRef.current = pad;
    return () => { pad.off(); padRef.current = null; };
  }, [step]);

  const clearPad = useCallback(() => {
    padRef.current?.clear();
    setIsSigned(false);
  }, []);

  const handleSubmit = () => {
    const sig = padRef.current?.toDataURL("image/png") ?? "";
    onConfirm(note.trim(), sig);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(17,25,40,0.65)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#fff", border: `1px solid ${border}` }}
      >
        {/* Header */}
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${border}`, background: "#ECFDF5" }}>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: green }}>
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: dark }}>Accept Proposal</h3>
              <p className="text-xs mt-0.5" style={{ color: muted }}>
                {step === "details" ? "Add a note before signing" : "Draw your signature below"}
              </p>
            </div>
            {/* Step dots */}
            <div className="ml-auto flex items-center gap-1.5">
              {(["details", "sign"] as const).map((s) => (
                <span
                  key={s}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: step === s ? 20 : 8,
                    background: step === s ? green : `${green}40`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step 1 – Note */}
        {step === "details" && (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: primary }}>
                Your Note <span style={{ color: muted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please proceed with the website module first. Looking forward to working together!"
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors leading-relaxed"
                style={{ border: `1.5px solid ${border}`, color: dark }}
                onFocus={(e) => e.target.style.borderColor = primary}
                onBlur={(e) => e.target.style.borderColor = border}
              />
            </div>

            {/* Agreement checkbox text */}
            <div
              className="rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, color: "#166534" }}
            >
              By proceeding to sign, you confirm that you have read, understood, and agreed to all terms and conditions stated in this proposal.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 h-11 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: border, color: dark }}
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("sign")}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-sm"
                style={{ background: primary }}
              >
                <PenLine className="h-4 w-4" />
                Continue to Sign
              </button>
            </div>
          </div>
        )}

        {/* Step 2 – Signature */}
        {step === "sign" && (
          <div className="p-6 space-y-4">
            {/* Signer identity */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#F9FAFB", border: `1px solid ${border}` }}>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: `${primary}15`, color: primary }}>
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: dark }}>{clientName}</p>
                <p className="text-xs" style={{ color: muted }}>Signing as client · {format(new Date(), "dd MMM yyyy, h:mm a")}</p>
              </div>
            </div>

            {/* Signature canvas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>
                  Digital Signature <span style={{ color: "red", fontWeight: 400 }}>*</span>
                </label>
                <button
                  onClick={clearPad}
                  className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                  style={{ color: muted }}
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              </div>

              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  border: `2px dashed ${isSigned ? green : border}`,
                  background: isSigned ? "#F0FDF4" : "#FAFAFA",
                  transition: "all 0.2s",
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full touch-none"
                  style={{ height: 160, display: "block", cursor: "crosshair" }}
                />
                {!isSigned && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                    <PenLine className="h-6 w-6" style={{ color: `${muted}60` }} />
                    <p className="text-xs" style={{ color: `${muted}80` }}>Draw your signature here</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: subtle }}>
                By signing above you agree this is a legally binding electronic signature.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep("details")}
                disabled={isPending}
                className="h-11 px-5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: border, color: dark }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !isSigned}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: green }}
              >
                {isPending
                  ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                Accept &amp; Sign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeclineModal({ onConfirm, onCancel, isPending }: {
  onConfirm: (r: string) => void; onCancel: () => void; isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell>
      <div className="p-7 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#FEF2F2" }}>
            <ThumbsDown className="h-7 w-7" style={{ color: red }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: dark }}>Decline this Proposal?</h3>
            <p className="text-sm mt-1" style={{ color: muted }}>Help us improve by sharing the reason.</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: dark }}>
            Reason <span style={{ color: red }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Budget constraints, chose another vendor, timeline doesn't work…"
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
            style={{ border: `1.5px solid ${border}`, color: dark }}
            onFocus={(e) => e.target.style.borderColor = primary}
            onBlur={(e) => e.target.style.borderColor = border}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: border, color: dark }}
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={isPending || !reason.trim()}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            style={{ background: red }}
          >
            {isPending
              ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <XCircle className="h-4 w-4" />
            }
            Decline
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function CounterModal({ onConfirm, onCancel, isPending }: {
  onConfirm: (n: string) => void; onCancel: () => void; isPending: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <ModalShell>
      <div className="p-7 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#FFFBEB" }}>
            <MessageSquare className="h-7 w-7" style={{ color: orange }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: dark }}>Send a Counter Offer</h3>
            <p className="text-sm mt-1" style={{ color: muted }}>
              Share what changes you'd like — pricing, scope, or timeline.
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: dark }}>Your Counter Offer</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. We'd prefer ₹80,000 with the mobile module removed from scope…"
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
            style={{ border: `1.5px solid ${border}`, color: dark }}
            onFocus={(e) => e.target.style.borderColor = orange}
            onBlur={(e) => e.target.style.borderColor = border}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: border, color: dark }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note.trim())}
            disabled={isPending || !note.trim()}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            style={{ background: orange }}
          >
            {isPending
              ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <ChevronRight className="h-4 w-4" />
            }
            Send Offer
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Discussion Panel ─────────────────────────────────────────────────────── */
function DiscussionPanel({ token }: { token: string }) {
  const { data, isLoading } = usePublicProposalComments(token);
  const addComment = useAddPublicComment(token);
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
    await addComment.mutateAsync({ content, authorName: "Customer" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Messages area */}
      <div
        className="space-y-4 overflow-y-auto pr-1"
        style={{ minHeight: 200, maxHeight: 380 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span
              className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${primary}40`, borderTopColor: "transparent" }}
            />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ background: "#EFF6FF" }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: primary }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: dark }}>Start a conversation</p>
            <p className="text-xs text-center leading-relaxed" style={{ color: subtle }}>
              Have questions about this proposal? Ask us anything.
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const isClient = c.authorType === "client";
            return (
              <div key={c.id} className={`flex gap-3 ${isClient ? "flex-row-reverse" : ""}`}>
                <div
                  className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isClient ? primary : "#F3F4F6",
                    color: isClient ? "#fff" : dark,
                  }}
                >
                  {isClient ? "C" : c.authorName.charAt(0).toUpperCase()}
                </div>
                <div className={`flex flex-col gap-1 max-w-[75%] ${isClient ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] font-medium px-1" style={{ color: subtle }}>
                    {isClient ? "You" : c.authorName} · {format(new Date(c.createdAt), "MMM d, h:mm a")}
                  </span>
                  <div
                    className="px-4 py-2.5 text-sm leading-relaxed"
                    style={isClient
                      ? { background: primary, color: "#fff", borderRadius: "16px 4px 16px 16px" }
                      : { background: rowAlt, color: dark, border: `1px solid ${border}`, borderRadius: "4px 16px 16px 16px" }
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
      <div
        className="flex gap-2 pt-4"
        style={{ borderTop: `1px solid ${border}` }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Type your message… (Enter to send)"
          rows={2}
          className="flex-1 resize-none text-sm outline-none px-3.5 py-2.5 rounded-xl transition-colors"
          style={{ border: `1.5px solid ${border}`, color: dark }}
          onFocus={(e) => e.target.style.borderColor = primary}
          onBlur={(e) => e.target.style.borderColor = border}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || addComment.isPending}
          className="h-10 w-10 self-end rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90 disabled:opacity-30"
          style={{ background: primary, color: "#fff" }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function PublicProposalView() {
  const [, params] = useRoute("/proposal/:id/:token");
  const token = params?.token ?? "";

  const { data: proposal, isLoading, isError, refetch } = useGetPublicProposal(token);
  const approve = usePublicApproveProposal(token);
  const decline = usePublicDeclineProposal(token);
  const counter = usePublicCounterProposal(token);

  const [actionState, setActionState] = useState<ActionState>("idle");
  const [doneEvent, setDoneEvent] = useState<"approved" | "declined" | "counter_offer" | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  const handleApprove = async (note: string, signature: string) => {
    try {
      await approve.mutateAsync({ note: note || undefined, signature: signature || undefined });
      setDoneEvent("approved");
      setActionState("done");
      refetch();
    } catch { setActionState("idle"); }
  };
  const handleDecline = async (reason: string) => {
    try { await decline.mutateAsync({ reason }); setDoneEvent("declined"); setActionState("done"); refetch(); }
    catch { setActionState("idle"); }
  };
  const handleCounter = async (note: string) => {
    try { await counter.mutateAsync({ note }); setDoneEvent("counter_offer"); setActionState("done"); refetch(); }
    catch { setActionState("idle"); }
  };

  /* Loading */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: pageBg }}>
        <div className="text-center space-y-4">
          <div
            className="h-12 w-12 rounded-full border-[3px] border-t-transparent animate-spin mx-auto"
            style={{ borderColor: `${primary}30 ${primary}30 ${primary}30 ${primary}` }}
          />
          <p className="text-sm" style={{ color: muted }}>Loading your proposal…</p>
        </div>
      </div>
    );
  }

  /* Error */
  if (isError || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: pageBg }}>
        <div className="text-center space-y-4 max-w-xs">
          <AlertCircle className="h-14 w-14 mx-auto" style={{ color: red }} />
          <h2 className="text-xl font-bold" style={{ color: dark }}>Proposal Not Found</h2>
          <p className="text-sm leading-relaxed" style={{ color: muted }}>
            This link may have expired or the proposal doesn't exist.
          </p>
          <a href={`mailto:${COMPANY_BILLING.email}`} className="text-sm font-semibold hover:underline" style={{ color: primary }}>
            {COMPANY_BILLING.email}
          </a>
        </div>
      </div>
    );
  }

  /* Derived */
  const { subtotal, tax, calculated, finalTotal, adjustmentDelta } = resolveProposalTotal(proposal);
  const isPastValidity = !!(proposal.validUntil && new Date(proposal.validUntil) < new Date());
  const canAct = ["sent", "seen"].includes(proposal.status);
  const currentStatus: "approved" | "declined" | "counter_offer" | null =
    doneEvent ?? (["approved", "declined", "counter_offer"].includes(proposal.status)
      ? proposal.status as "approved" | "declined" | "counter_offer"
      : null);

  const company     = proposal.companySettings;
  const companyName = company?.companyName ?? COMPANY_BILLING.name;
  const clientName    = proposal.lead?.name    ?? proposal.customer?.contactPerson ?? "Client";
  const clientCompany = proposal.lead?.company ?? proposal.customer?.companyName   ?? null;
  const clientEmail   = proposal.lead?.email   ?? proposal.customer?.email         ?? null;
  const clientPhone   = proposal.lead?.phone   ?? proposal.customer?.phone         ?? null;

  const statusConfig = {
    sent:          { label: "Awaiting Response",   chip: `${primary}15`, text: primary, dot: primary },
    seen:          { label: "Awaiting Response",   chip: `${primary}15`, text: primary, dot: primary },
    approved:      { label: "Accepted",            chip: "#ECFDF5",     text: green,   dot: green },
    declined:      { label: "Declined",            chip: "#FEF2F2",     text: red,     dot: red },
    counter_offer: { label: "Counter Offer Sent",  chip: "#FFFBEB",     text: orange,  dot: orange },
    expired:       { label: "Expired",             chip: "#F9FAFB",     text: muted,   dot: subtle },
    draft:         { label: "Draft",               chip: "#F9FAFB",     text: muted,   dot: subtle },
    revised:       { label: "Revised",             chip: "#EEF2FF",     text: "#4338CA", dot: "#4338CA" },
  } as const;
  const sCfg = statusConfig[proposal.status as keyof typeof statusConfig] ?? statusConfig.sent;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: pageBg }}>
      {/* Modals */}
      {actionState === "approving"  && <ConfirmApproveModal onConfirm={handleApprove} onCancel={() => setActionState("idle")} isPending={approve.isPending} clientName={clientName} />}
      {actionState === "declining"  && <DeclineModal        onConfirm={handleDecline} onCancel={() => setActionState("idle")} isPending={decline.isPending} />}
      {actionState === "countering" && <CounterModal        onConfirm={handleCounter} onCancel={() => setActionState("idle")} isPending={counter.isPending} />}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {company?.logoUrl
              ? <img src={company.logoUrl} alt="logo" className="h-9 object-contain" />
              : <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-black" style={{ background: primary }}>SK</div>
            }
            <div>
              <p className="font-bold text-sm leading-none" style={{ color: dark }}>{companyName}</p>
              <p className="text-xs mt-0.5" style={{ color: subtle }}>{COMPANY_BILLING.email}</p>
            </div>
          </div>
          {/* Status chip */}
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: sCfg.chip, color: sCfg.text }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: sCfg.dot }} />
            {sCfg.label}
          </div>
        </div>

        {/* ── Two-column body ───────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ════════════════════════════════════════════════════════════════
              LEFT – Document
          ════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-0 rounded-2xl overflow-hidden shadow-sm" style={{ background: "#fff", border: `1px solid ${border}` }}>

            {/* Letterhead */}
            <div className="flex items-start justify-between gap-6 px-8 py-7" style={{ borderBottom: `3px solid ${primary}` }}>
              {/* Company identity */}
              <div className="flex items-start gap-4 min-w-0">
                {company?.logoUrl
                  ? <img src={company.logoUrl} alt="logo" className="h-14 object-contain flex-shrink-0" />
                  : (
                    <div
                      className="h-14 w-14 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-xl"
                      style={{ background: primary }}
                    >
                      SK
                    </div>
                  )
                }
                <div className="min-w-0">
                  <h2 className="font-extrabold text-lg leading-tight truncate" style={{ color: dark }}>{companyName}</h2>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: muted }}>
                    {company?.address ?? COMPANY_BILLING.address}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <span className="text-xs" style={{ color: muted }}>{COMPANY_BILLING.phone}</span>
                    <span className="text-xs" style={{ color: muted }}>{COMPANY_BILLING.email}</span>
                    <span className="text-xs font-mono" style={{ color: subtle }}>GSTIN: {COMPANY_BILLING.gstin}</span>
                  </div>
                </div>
              </div>

              {/* Proposal label */}
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-3xl font-black uppercase tracking-wide"
                  style={{ color: primary, letterSpacing: "0.05em" }}
                >
                  Proposal
                </p>
                <p className="text-sm font-mono font-semibold mt-1" style={{ color: muted }}>{proposal.number}</p>
                {proposal.revision > 1 && (
                  <span
                    className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${primary}15`, color: primary }}
                  >
                    Revision {proposal.revision}
                  </span>
                )}
              </div>
            </div>

            {/* Proposal title */}
            <div className="px-8 py-4" style={{ borderBottom: `1px solid ${border}`, background: `${primary}08` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: primary }}>Subject</p>
              <h1 className="text-base font-bold" style={{ color: dark }}>{proposal.title}</h1>
            </div>

            {/* Bill To / Proposal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ borderBottom: `1px solid ${border}` }}>
              {/* Bill To */}
              <div className="px-8 py-6" style={{ borderRight: `1px solid ${border}` }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: primary }}>
                  Prepared For
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: `${primary}15`, color: primary }}>
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight" style={{ color: dark }}>{clientName}</p>
                      {clientCompany && <p className="text-xs" style={{ color: muted }}>{clientCompany}</p>}
                    </div>
                  </div>
                  {clientEmail && (
                    <div className="flex items-center gap-2 pl-0.5">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: subtle }} />
                      <span className="text-xs" style={{ color: muted }}>{clientEmail}</span>
                    </div>
                  )}
                  {clientPhone && (
                    <div className="flex items-center gap-2 pl-0.5">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: subtle }} />
                      <span className="text-xs" style={{ color: muted }}>{clientPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="px-8 py-6">
                <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: primary }}>
                  Proposal Details
                </p>
                <div className="space-y-2.5">
                  <MetaRow label="Proposal No." value={proposal.number} mono />
                  {proposal.sentAt && <MetaRow label="Date Issued" value={format(new Date(proposal.sentAt), "dd MMM yyyy")} />}
                  {proposal.validUntil && (
                    <MetaRow
                      label="Valid Until"
                      value={format(new Date(proposal.validUntil), "dd MMM yyyy")}
                      valueStyle={{ color: isPastValidity ? orange : dark, fontWeight: 600 }}
                      suffix={isPastValidity ? " (Expired)" : undefined}
                    />
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs" style={{ color: subtle }}>Status</span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: sCfg.chip, color: sCfg.text }}
                    >
                      {sCfg.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: dark }}>
                    <th className="text-center py-3.5 px-5 text-[10px] font-black uppercase tracking-widest w-14" style={{ color: "#6B7280" }}>#</th>
                    <th className="text-left py-3.5 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#fff" }}>Item</th>
                    <th className="text-right py-3.5 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Qty</th>
                    <th className="text-right py-3.5 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Rate</th>
                    <th className="text-right py-3.5 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Tax</th>
                    <th className="text-right py-3.5 px-6 text-[10px] font-black uppercase tracking-widest" style={{ color: "#fff" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item, idx) => {
                    const line    = item.quantity * item.unitPrice;
                    const lineTax = line * (item.taxPercent / 100);
                    const isEven  = idx % 2 === 0;
                    return (
                      <tr
                        key={item.itemId ?? idx}
                        style={{
                          background: isEven ? "#fff" : "#F5F8FF",
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <td className="text-center py-4 px-5 text-xs font-bold tabular-nums align-top pt-5" style={{ color: primary }}>
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-sm" style={{ color: dark }}>
                            {item.name || <span style={{ color: subtle, fontWeight: 400 }}>—</span>}
                          </p>
                          {item.description && (
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: muted }}>
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums align-top pt-5" style={{ color: muted }}>
                          {item.quantity}
                        </td>
                        <td className="py-4 px-4 text-right tabular-nums align-top pt-5" style={{ color: muted }}>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-4 px-4 text-right text-xs align-top pt-5" style={{ color: subtle }}>
                          {item.taxPercent > 0 ? `GST ${item.taxPercent}%` : "—"}
                        </td>
                        <td className="py-4 px-6 text-right font-bold tabular-nums align-top pt-5" style={{ color: dark }}>
                          {formatCurrency(line + lineTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-8 py-6 flex justify-end" style={{ borderTop: `1px solid ${border}` }}>
              <div className="w-full max-w-xs">
                <div className="space-y-2.5 pb-4" style={{ borderBottom: `1px solid ${border}` }}>
                  <TotRow label="Subtotal" val={formatCurrency(subtotal)} />
                  <TotRow label="Tax (GST)" val={formatCurrency(tax)} />
                  {proposal.discount > 0 && (
                    <TotRow
                      label={`Discount (${proposal.discount}%)`}
                      val={`− ${formatCurrency(calculated - (subtotal + tax))}`}
                      valColor={orange}
                    />
                  )}
                  {adjustmentDelta !== 0 && (
                    <TotRow
                      label="Amount Adjustment"
                      val={`${adjustmentDelta > 0 ? "+ " : "− "}${formatCurrency(Math.abs(adjustmentDelta))}`}
                      valColor={primary}
                    />
                  )}
                </div>

                {/* Grand total */}
                <div
                  className="flex items-center justify-between mt-4 px-5 py-4 rounded-xl"
                  style={{ background: dark }}
                >
                  <span className="text-sm font-semibold" style={{ color: "#9CA3AF" }}>Total Amount</span>
                  <span className="text-xl font-black tabular-nums" style={{ color: orange }}>
                    {formatCurrency(finalTotal)}
                  </span>
                </div>

                {/* In words */}
                <div
                  className="mt-3 px-4 py-3 rounded-xl"
                  style={{ background: `${primary}08`, border: `1px solid ${primary}20` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: primary }}>Amount in Words</p>
                  <p className="text-xs italic mt-1 leading-relaxed" style={{ color: dark }}>
                    {numberToWords(finalTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Note + Terms */}
            {(proposal.clientNote || proposal.terms) && (
              <div
                className="px-8 py-6 space-y-5"
                style={{ borderTop: `1px solid ${border}` }}
              >
                {proposal.clientNote && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: primary }}>Note</p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: dark }}>{proposal.clientNote}</p>
                  </div>
                )}
                {proposal.terms && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: primary }}>Terms &amp; Conditions</p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: muted }}>{proposal.terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Seal + Signature */}
            <div
              className="flex items-end justify-between px-8 py-6"
              style={{ borderTop: `1px dashed ${border}`, background: rowAlt }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: subtle }}>
                  For {companyName}
                </p>
                <div
                  className="h-px w-32 mb-2"
                  style={{ background: muted }}
                />
                <p className="text-xs font-semibold" style={{ color: dark }}>Authorised Signatory</p>
                {(company?.address ?? COMPANY_BILLING.address) && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: subtle }} />
                    <p className="text-xs" style={{ color: muted }}>{company?.address ?? COMPANY_BILLING.address}</p>
                  </div>
                )}
              </div>
              {company?.sealUrl && (
                <img src={company.sealUrl} alt="Official seal" className="h-20 w-20 object-contain" style={{ opacity: 0.9 }} />
              )}
            </div>

            {/* Status banner */}
            {currentStatus && (
              <div
                className="flex items-start gap-4 px-8 py-5"
                style={{
                  borderTop: `1px solid ${border}`,
                  background: currentStatus === "approved" ? "#ECFDF5" : currentStatus === "declined" ? "#FEF2F2" : "#FFFBEB",
                }}
              >
                {currentStatus === "approved" && (
                  <>
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: green }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: green }}>Proposal Accepted</p>
                      <p className="text-xs mt-0.5" style={{ color: green }}>Our team will reach out to you shortly. Thank you!</p>
                    </div>
                  </>
                )}
                {currentStatus === "declined" && (
                  <>
                    <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: red }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: red }}>Proposal Declined</p>
                      <p className="text-xs mt-0.5" style={{ color: red }}>Thank you for letting us know. Feel free to reach out to explore alternatives.</p>
                    </div>
                  </>
                )}
                {currentStatus === "counter_offer" && (
                  <>
                    <MessageSquare className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: orange }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: orange }}>Counter Offer Received</p>
                      <p className="text-xs mt-0.5" style={{ color: orange }}>We'll review your counter and respond within 24 hours.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            {canAct && actionState === "idle" && (
              <div className="px-8 py-6" style={{ borderTop: `1px solid ${border}` }}>
                {isPastValidity && (
                  <div
                    className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
                    style={{ background: "#FFFBEB", border: `1px solid #FDE68A` }}
                  >
                    <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: orange }} />
                    <p className="text-xs leading-relaxed" style={{ color: orange }}>
                      The validity date has passed. You may still respond and we'll review your submission.
                    </p>
                  </div>
                )}

                <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: primary }}>
                  Your Response
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setActionState("approving")}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 hover:shadow-lg shadow-md"
                    style={{ background: green }}
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Accept Proposal
                  </button>
                  <button
                    onClick={() => setActionState("countering")}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 hover:shadow-md"
                    style={{ background: orange }}
                  >
                    <MessageSquare className="h-4.5 w-4.5" />
                    Counter Offer
                  </button>
                  <button
                    onClick={() => setActionState("declining")}
                    className="flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:bg-red-50"
                    style={{ color: red, border: `1.5px solid ${red}` }}
                  >
                    <XCircle className="h-4.5 w-4.5" />
                    Decline
                  </button>
                </div>
                <p className="text-center text-[11px] mt-4" style={{ color: subtle }}>
                  Questions? Contact us at{" "}
                  <a href={`mailto:${COMPANY_BILLING.email}`} className="hover:underline font-semibold" style={{ color: primary }}>
                    {COMPANY_BILLING.email}
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              RIGHT – Summary & Discussion
          ════════════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <div
              className="rounded-2xl overflow-hidden shadow-sm sticky top-6"
              style={{ background: "#fff", border: `1px solid ${border}` }}
            >
              {/* Tab header */}
              <div className="flex" style={{ borderBottom: `1px solid ${border}` }}>
                {(["summary", "discussion"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className="flex-1 py-4 text-xs font-bold uppercase tracking-widest capitalize transition-all"
                    style={{
                      color: activeTab === t ? primary : subtle,
                      borderBottom: activeTab === t ? `2px solid ${primary}` : "2px solid transparent",
                      background: activeTab === t ? `${primary}06` : "transparent",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === "summary" ? (
                  <div className="space-y-6">
                    {/* Proposal */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: primary }}>Proposal</p>
                      <div className="space-y-2.5">
                        <PanelRow label="Number" value={proposal.number} mono />
                        <PanelRow label="Title" value={proposal.title} />
                        {proposal.sentAt && <PanelRow label="Sent" value={format(new Date(proposal.sentAt), "dd MMM yyyy")} />}
                        {proposal.validUntil && (
                          <PanelRow
                            label="Valid Until"
                            value={format(new Date(proposal.validUntil), "dd MMM yyyy")}
                            valueColor={isPastValidity ? orange : undefined}
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: subtle }}>Status</span>
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: sCfg.chip, color: sCfg.text }}
                          >
                            {sCfg.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Client */}
                    <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20 }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: primary }}>Client</p>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: `${primary}12`, color: primary }}>
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: dark }}>{clientName}</p>
                            {clientCompany && <p className="text-xs" style={{ color: muted }}>{clientCompany}</p>}
                          </div>
                        </div>
                        {clientEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: subtle }} />
                            <span className="text-xs" style={{ color: muted }}>{clientEmail}</span>
                          </div>
                        )}
                        {clientPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: subtle }} />
                            <span className="text-xs" style={{ color: muted }}>{clientPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20 }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: primary }}>Amount</p>
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${border}` }}
                      >
                        <div className="px-4 py-3.5 space-y-2" style={{ background: rowAlt }}>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: subtle }}>Subtotal</span>
                            <span className="tabular-nums font-medium" style={{ color: dark }}>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: subtle }}>Tax</span>
                            <span className="tabular-nums font-medium" style={{ color: dark }}>{formatCurrency(tax)}</span>
                          </div>
                          {proposal.discount > 0 && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: subtle }}>Discount</span>
                              <span className="tabular-nums font-medium" style={{ color: orange }}>−{proposal.discount}%</span>
                            </div>
                          )}
                        </div>
                        <div
                          className="flex items-center justify-between px-4 py-3.5"
                          style={{ background: dark }}
                        >
                          <span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Total</span>
                          <span className="text-base font-black tabular-nums" style={{ color: orange }}>
                            {formatCurrency(finalTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DiscussionPanel token={token} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-2 space-y-1">
          <p className="text-xs font-semibold" style={{ color: muted }}>{companyName}</p>
          <p className="text-[11px]" style={{ color: subtle }}>
            {COMPANY_BILLING.address} · {COMPANY_BILLING.phone} · {COMPANY_BILLING.email}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Small helpers ─────────────────────────────────────────────────────────── */
function MetaRow({ label, value, mono, valueStyle, suffix }: {
  label: string; value: string; mono?: boolean;
  valueStyle?: React.CSSProperties; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs flex-shrink-0" style={{ color: subtle }}>{label}</span>
      <span
        className={`text-xs font-semibold text-right min-w-0 truncate ${mono ? "font-mono" : ""}`}
        style={{ color: dark, ...valueStyle }}
      >
        {value}{suffix}
      </span>
    </div>
  );
}

function TotRow({ label, val, valColor }: { label: string; val: string; valColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: muted }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: valColor ?? dark }}>{val}</span>
    </div>
  );
}

function PanelRow({ label, value, mono, valueColor }: {
  label: string; value: string; mono?: boolean; valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs flex-shrink-0" style={{ color: subtle }}>{label}</span>
      <span
        className={`text-xs font-semibold text-right break-words min-w-0 ${mono ? "font-mono" : ""}`}
        style={{ color: valueColor ?? dark }}
      >
        {value}
      </span>
    </div>
  );
}
