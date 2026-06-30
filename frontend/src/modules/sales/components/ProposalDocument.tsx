import { format } from "date-fns";
import type { PublicProposal } from "@/api/sales";
import { COMPANY_BILLING, formatCurrency } from "../constants";
import { numberToWords, resolveProposalTotal } from "../utils";

const primary = "#1A56DB";
const orange = "#E8630A";
const green = "#057A55";
const red = "#C81E1E";
const dark = "#111928";
const muted = "#6B7280";
const subtle = "#9CA3AF";
const border = "#E5E7EB";
const rowAlt = "#F9FAFB";

type StatusChip = { label: string; chip: string; text: string; dot: string };

function MetaRow({
  label,
  value,
  mono,
  valueStyle,
  suffix,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueStyle?: React.CSSProperties;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs flex-shrink-0" style={{ color: subtle }}>{label}</span>
      <span
        className={`text-xs font-semibold text-right min-w-0 break-words ${mono ? "font-mono" : ""}`}
        style={{ color: dark, ...valueStyle }}
      >
        {value}
        {suffix}
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

export function ProposalDocument({
  proposal,
  currentStatus,
  statusChip,
  compact = false,
  forPdf = false,
}: {
  proposal: PublicProposal;
  currentStatus: "approved" | "declined" | "counter_offer" | null;
  statusChip: StatusChip;
  /** Tighter layout for single-page PDF export. */
  compact?: boolean;
  /** Full content, multi-page PDF export — no truncation or hidden rows. */
  forPdf?: boolean;
}) {
  const items = proposal.items ?? [];
  const { subtotal, tax, calculated, finalTotal, adjustmentDelta } = resolveProposalTotal({
    ...proposal,
    items,
  });
  const isPastValidity = !!(proposal.validUntil && new Date(proposal.validUntil) < new Date());

  const company = proposal.companySettings;
  const companyName = company?.companyName ?? COMPANY_BILLING.name;
  const clientName = proposal.lead?.name ?? proposal.customer?.contactPerson ?? "Client";
  const clientCompany = proposal.lead?.company ?? proposal.customer?.companyName ?? null;
  const clientEmail = proposal.lead?.email ?? proposal.customer?.email ?? null;
  const clientPhone = proposal.lead?.phone ?? proposal.customer?.phone ?? null;

  const padX = forPdf || compact ? "px-5" : "px-8";
  const padYHead = forPdf || compact ? "py-4" : "py-7";
  const padYSection = forPdf || compact ? "py-4" : "py-6";
  const padYSubject = forPdf || compact ? "py-2.5" : "py-4";
  const logoH = forPdf || compact ? "h-10" : "h-14";
  const logoBox = forPdf || compact ? "h-10 w-10 text-base" : "h-14 w-14 text-xl";
  const titleSize = forPdf || compact ? "text-2xl" : "text-3xl";
  const isTight = forPdf || compact;
  const visibleItems = forPdf ? items : items.slice(0, isTight ? 6 : items.length);
  const hiddenItemCount = forPdf ? 0 : items.length - visibleItems.length;
  const noteText = proposal.clientNote;
  const termsText = proposal.terms;

  return (
    <div
      className={`rounded-2xl shadow-sm bg-white ${forPdf || compact ? "overflow-visible" : "overflow-hidden"}`}
      style={{ border: `1px solid ${border}`, fontFamily: "system-ui, sans-serif" }}
    >
      <div className={`flex items-start justify-between gap-6 ${padX} ${padYHead}`} style={{ borderBottom: `3px solid ${primary}` }}>
        <div className="flex items-start gap-4 min-w-0">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="logo" className={`${logoH} object-contain flex-shrink-0`} />
          ) : (
            <div
              className={`${logoBox} rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black`}
              style={{ background: primary }}
            >
              SK
            </div>
          )}
          <div className="min-w-0">
            <h2 className={`font-extrabold leading-tight break-words ${isTight ? "text-base" : "text-lg"}`} style={{ color: dark }}>{companyName}</h2>
            <p className={`${compact ? "text-[10px]" : "text-xs"} mt-1 leading-relaxed`} style={{ color: muted }}>
              {company?.address ?? COMPANY_BILLING.address}
            </p>
            <div className={`flex flex-wrap gap-3 ${compact ? "mt-1" : "mt-1.5"}`}>
              <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: muted }}>{COMPANY_BILLING.phone}</span>
              <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: muted }}>{COMPANY_BILLING.email}</span>
              <span className={`${compact ? "text-[10px]" : "text-xs"} font-mono`} style={{ color: subtle }}>GSTIN: {COMPANY_BILLING.gstin}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`${titleSize} font-black uppercase tracking-wide`} style={{ color: primary, letterSpacing: "0.05em" }}>
            Proposal
          </p>
          <p className={`${compact ? "text-xs" : "text-sm"} font-mono font-semibold mt-1`} style={{ color: muted }}>{proposal.number}</p>
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

      <div className={`${padX} ${padYSubject}`} style={{ borderBottom: `1px solid ${border}`, background: `${primary}08` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: primary }}>Subject</p>
        <h1 className={`${compact ? "text-sm" : "text-base"} font-bold`} style={{ color: dark }}>{proposal.title}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ borderBottom: `1px solid ${border}` }}>
        <div className={`${padX} ${padYSection}`} style={{ borderRight: `1px solid ${border}` }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: primary }}>Prepared For</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`${compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"} rounded-lg flex items-center justify-center font-bold flex-shrink-0`}
                style={{ background: `${primary}15`, color: primary }}
              >
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className={`${compact ? "text-xs" : "text-sm"} font-bold leading-tight`} style={{ color: dark }}>{clientName}</p>
                {clientCompany && <p className={`${compact ? "text-[10px]" : "text-xs"}`} style={{ color: muted }}>{clientCompany}</p>}
              </div>
            </div>
            {clientEmail && (
              <div className="flex items-center gap-2 pl-0.5">
                <span className={`${compact ? "text-[10px]" : "text-xs"} font-semibold flex-shrink-0`} style={{ color: subtle }}>Email</span>
                <span className={`${compact ? "text-[10px]" : "text-xs"}`} style={{ color: muted }}>{clientEmail}</span>
              </div>
            )}
            {clientPhone && (
              <div className="flex items-center gap-2 pl-0.5">
                <span className={`${compact ? "text-[10px]" : "text-xs"} font-semibold flex-shrink-0`} style={{ color: subtle }}>Phone</span>
                <span className={`${compact ? "text-[10px]" : "text-xs"}`} style={{ color: muted }}>{clientPhone}</span>
              </div>
            )}
          </div>
        </div>
        <div className={`${padX} ${padYSection}`}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: primary }}>Proposal Details</p>
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
                style={{ background: statusChip.chip, color: statusChip.text }}
              >
                {statusChip.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: dark }}>
              <th className={`text-center ${compact ? "py-2 px-3" : "py-3.5 px-5"} text-[10px] font-black uppercase tracking-widest w-14`} style={{ color: "#6B7280" }}>#</th>
              <th className={`text-left ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#fff" }}>Item</th>
              <th className={`text-right ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#6B7280" }}>Qty</th>
              <th className={`text-right ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#6B7280" }}>Rate</th>
              <th className={`text-right ${compact ? "py-2 px-3" : "py-3.5 px-4"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#6B7280" }}>Tax</th>
              <th className={`text-right ${compact ? "py-2 px-4" : "py-3.5 px-6"} text-[10px] font-black uppercase tracking-widest`} style={{ color: "#fff" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, idx) => {
              const line = item.quantity * item.unitPrice;
              const lineTax = line * (item.taxPercent / 100);
              const cellPad = isTight ? "py-2 px-3" : "py-4 px-4";
              const cellPadFirst = isTight ? "py-2 px-3" : "py-4 px-5";
              const cellPadLast = isTight ? "py-2 px-4" : "py-4 px-6";
              const alignTop = isTight ? "align-top pt-2" : "align-top pt-5";
              return (
                <tr
                  key={item.itemId ?? idx}
                  style={{ background: idx % 2 === 0 ? "#fff" : "#F5F8FF", borderBottom: `1px solid ${border}` }}
                >
                  <td className={`text-center ${cellPadFirst} text-xs font-bold tabular-nums ${alignTop}`} style={{ color: primary }}>
                    {idx + 1}
                  </td>
                  <td className={cellPad}>
                    <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`} style={{ color: dark }}>{item.name || "—"}</p>
                    {item.description && (
                      <p className={`${forPdf ? "text-xs" : isTight ? "text-[10px]" : "text-xs"} mt-1 leading-relaxed break-words`} style={{ color: muted }}>
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className={`${cellPad} text-right tabular-nums ${alignTop}`} style={{ color: muted }}>{item.quantity}</td>
                  <td className={`${cellPad} text-right tabular-nums ${alignTop}`} style={{ color: muted }}>
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className={`${cellPad} text-right text-xs ${alignTop}`} style={{ color: subtle }}>
                    {item.taxPercent > 0 ? `GST ${item.taxPercent}%` : "—"}
                  </td>
                  <td className={`${cellPadLast} text-right font-bold tabular-nums ${alignTop}`} style={{ color: dark }}>
                    {formatCurrency(line + lineTax)}
                  </td>
                </tr>
              );
            })}
            {hiddenItemCount > 0 && (
              <tr style={{ background: rowAlt, borderBottom: `1px solid ${border}` }}>
                <td colSpan={6} className={`${compact ? "py-2 px-4 text-[10px]" : "py-3 px-6 text-xs"} text-center italic`} style={{ color: muted }}>
                  + {hiddenItemCount} more line item{hiddenItemCount === 1 ? "" : "s"} (see full proposal online)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${padX} ${padYSection} flex justify-end`} style={{ borderTop: `1px solid ${border}` }}>
        <div className="w-full max-w-xs">
          <div className={`space-y-2.5 ${compact ? "pb-2" : "pb-4"}`} style={{ borderBottom: `1px solid ${border}` }}>
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
          <div className={`flex items-center justify-between ${compact ? "mt-2 px-4 py-3" : "mt-4 px-5 py-4"} rounded-xl`} style={{ background: dark }}>
            <span className={`${compact ? "text-xs" : "text-sm"} font-semibold`} style={{ color: "#9CA3AF" }}>Total Amount</span>
            <span className={`${compact ? "text-base" : "text-xl"} font-black tabular-nums`} style={{ color: orange }}>
              {formatCurrency(finalTotal)}
            </span>
          </div>
          <div
            className={`${compact ? "mt-2 px-3 py-2" : "mt-3 px-4 py-3"} rounded-xl`}
            style={{ background: `${primary}08`, border: `1px solid ${primary}20` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: primary }}>Amount in Words</p>
            <p className={`${compact ? "text-[10px]" : "text-xs"} italic mt-1 leading-relaxed`} style={{ color: dark }}>{numberToWords(finalTotal)}</p>
          </div>
        </div>
      </div>

      {(noteText || termsText) && (
        <div className={`${padX} ${padYSection} space-y-5`} style={{ borderTop: `1px solid ${border}` }}>
          {noteText && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: primary }}>Note</p>
              <p className={`${forPdf ? "text-sm" : isTight ? "text-xs" : "text-sm"} leading-relaxed whitespace-pre-line break-words`} style={{ color: dark }}>{noteText}</p>
            </div>
          )}
          {termsText && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: primary }}>
                Terms &amp; Conditions
              </p>
              <p className={`${forPdf ? "text-sm" : isTight ? "text-xs" : "text-sm"} leading-relaxed whitespace-pre-line break-words`} style={{ color: muted }}>{termsText}</p>
            </div>
          )}
        </div>
      )}

      <div
        className={`flex items-end justify-between ${padX} ${padYSection} gap-6`}
        style={{ borderTop: `1px dashed ${border}`, background: rowAlt }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: subtle }}>For {companyName}</p>
          <div className="h-px w-32 mb-2" style={{ background: muted }} />
          <p className="text-xs font-semibold" style={{ color: dark }}>Authorised Signatory</p>
          {(company?.address ?? COMPANY_BILLING.address) && (
            <p className="text-xs mt-1" style={{ color: muted }}>{company?.address ?? COMPANY_BILLING.address}</p>
          )}
        </div>
        {company?.sealUrl && (
          <img
            src={company.sealUrl}
            alt="Official seal"
            className={`${compact ? "h-14 w-14" : "h-20 w-20"} object-contain`}
            style={{ opacity: 0.9 }}
          />
        )}
      </div>

      {currentStatus && (
        <div
          className={`flex items-start gap-4 ${padX} ${compact ? "py-3" : "py-5"}`}
          style={{
            borderTop: `1px solid ${border}`,
            background: currentStatus === "approved" ? "#ECFDF5" : currentStatus === "declined" ? "#FEF2F2" : "#FFFBEB",
          }}
        >
          {currentStatus === "approved" && (
            <div>
              <p className="text-sm font-bold" style={{ color: green }}>Proposal Accepted</p>
              <p className="text-xs mt-0.5" style={{ color: green }}>Signed and accepted by the client.</p>
            </div>
          )}
          {currentStatus === "declined" && (
            <div>
              <p className="text-sm font-bold" style={{ color: red }}>Proposal Declined</p>
              <p className="text-xs mt-0.5" style={{ color: red }}>Client declined this proposal.</p>
            </div>
          )}
          {currentStatus === "counter_offer" && (
            <div>
              <p className="text-sm font-bold" style={{ color: orange }}>Counter Offer Sent</p>
              <p className="text-xs mt-0.5" style={{ color: orange }}>Client submitted a counter offer.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
