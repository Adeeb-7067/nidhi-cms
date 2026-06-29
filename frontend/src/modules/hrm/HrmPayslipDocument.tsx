import {
  Building2,
  Calendar,
  CalendarX,
  FileText,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  amountInWords,
  inrDecimal,
  inrMoney,
  type PayslipViewModel,
} from "./payslip-view-model";
import { HrmPayslipDownloadButton } from "./HrmPayslipDownloadButton";



function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-[11px] last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function formatDays(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function PayTable({
  title,
  icon: Icon,
  tone,
  rows,
  totalLabel,
  totalAmount,
}: {
  title: string;
  icon: typeof Wallet;
  tone: "earn" | "deduct";
  rows: { label: string; amount: number }[];
  totalLabel: string;
  totalAmount: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-[11px] font-extrabold tracking-wide",
          tone === "earn" ? "text-[#3f7f2d]" : "text-[#b42318]",
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        {title}
      </div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-slate-50 text-slate-500">
            <th className="px-3 py-2 text-left font-bold">{title}</th>
            <th className="px-3 py-2 text-right font-bold">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-700">{row.label}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                {inrDecimal(row.amount)}
              </td>
            </tr>
          ))}
          <tr
            className={cn(
              "border-t font-extrabold",
              tone === "earn" ? "bg-[#f0f7eb] text-[#3f7f2d]" : "bg-[#fef2f2] text-[#b42318]",
            )}
          >
            <td className="px-3 py-2.5">{totalLabel}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{inrDecimal(totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Satyakabir PayslipDocument layout — reference: HRM Satyakabir/Frontend */
export function HrmPayslipDocument({
  data,
  className,
  showDownload = true,
}: {
  data: PayslipViewModel;
  className?: string;
  showDownload?: boolean;
}) {
  const watermarkText = data.company.watermarkText || data.company.brandName;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center" aria-hidden>
        <img
          src={data.company.logoUrl}
          alt=""
          className="absolute max-h-[55%] max-w-[70%] -rotate-[28deg] object-contain opacity-[0.07]"
        />
        <span className="absolute -rotate-[32deg] select-none text-center text-5xl font-extrabold tracking-[0.18em] text-[#3f7f2d] opacity-[0.06] sm:text-6xl">
          {watermarkText}
        </span>
      </div>

      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex min-w-0 gap-3">
            <img
              src={data.company.logoUrl}
              alt={`${data.company.brandName} logo`}
              className="size-14 shrink-0 rounded-full border border-slate-100 bg-white object-contain p-0.5"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="min-w-0">
              <div className="text-2xl font-extrabold tracking-wide text-slate-900">
                {data.company.brandName}
              </div>
              <div className="mt-0.5 text-[10px] font-medium text-slate-600">{data.company.legalName}</div>
              {data.company.addressLine ? (
                <div className="mt-1 max-w-md text-[9px] leading-relaxed text-slate-500">
                  {data.company.addressLine}
                </div>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[9px] font-bold tracking-[0.12em] text-slate-500">PAYSLIP FOR THE MONTH</div>
            <div className="mt-1 text-2xl font-extrabold text-[#3f7f2d]">{data.periodLabel}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-extrabold tracking-wide text-slate-700">
              <User className="size-3.5 text-[#3f7f2d]" />
              EMPLOYEE DETAILS
            </div>
            <div className="px-3 py-1">
              <DetailLine label="Employee Name" value={data.employee.name} />
              <DetailLine label="Employee ID" value={data.employee.employeeId} />
              <DetailLine label="Designation" value={data.employee.designation} />
              <DetailLine label="Department" value={data.employee.department} />
              <DetailLine label="Pay Period" value={data.periodLabel} />
              <DetailLine label="Pay Date" value={data.payDate} />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="rounded-lg border border-[#d7e8cf] border-l-4 border-l-[#3f7f2d] bg-[#f7fbf4] p-4">
              <div className="text-[11px] font-extrabold tracking-wide text-slate-700">TOTAL NET PAY</div>
              <div className="mt-2 text-3xl font-extrabold leading-none text-[#3f7f2d]">
                {inrMoney(data.netPay)}
              </div>
              <div className="mt-2 text-[9px] leading-snug text-slate-500">
                (Rupees {amountInWords(data.netPay)} Only)
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                <Calendar className="size-3.5 text-[#3f7f2d]" />
                Paid Days: {formatDays(data.paidDays)}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                <CalendarX className="size-3.5 text-[#3f7f2d]" />
                LOP Days: {formatDays(data.lopDays)}
              </div>
              {data.lateDays != null && data.lateDays > 0 ? (
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                  <CalendarX className="size-3.5 text-[#3f7f2d]" />
                  Late marks: {data.lateDays}
                </div>
              ) : null}
              {data.wfhDays != null && data.wfhDays > 0 ? (
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                  <Building2 className="size-3.5 text-[#3f7f2d]" />
                  WFH Days: {data.wfhDays}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PayTable
            title="EARNINGS"
            icon={Wallet}
            tone="earn"
            rows={data.earnings}
            totalLabel="GROSS EARNINGS"
            totalAmount={data.grossEarnings}
          />
          <PayTable
            title="DEDUCTIONS"
            icon={FileText}
            tone="deduct"
            rows={data.deductions}
            totalLabel="TOTAL DEDUCTIONS"
            totalAmount={data.totalDeductions}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#d7e8cf] bg-[#f7fbf4] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-[#3f7f2d] text-white">
              <Wallet className="size-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">TOTAL NET PAYABLE</div>
              <div className="text-[10px] text-slate-500">(Gross Earnings - Total Deductions)</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#3f7f2d]">{inrMoney(data.netPay)}</div>
            <div className="text-[9px] text-slate-500">
              (Rupees {amountInWords(data.netPay)} Only)
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 border-b-2 border-[#3f7f2d] pb-1 text-[11px] font-extrabold tracking-wide text-slate-700">
              COMPANY AUTHORIZED SIGNATORY
            </div>
            <div className="flex min-h-[88px] flex-col items-end justify-end gap-2">
              <div className="w-40 border-b border-dashed border-slate-300" />
              <div className="text-right text-[10px] text-slate-600">Authorized Signatory</div>
              <div className="text-right text-[10px] text-slate-400">{data.company.legalName}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-500">
          This is a system generated payslip and does not require any signature.
        </div>

        {showDownload ? (
          <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
            <HrmPayslipDownloadButton payslipId={Number(data.payslipId)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
