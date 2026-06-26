import type { ReactNode, CSSProperties } from "react";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { HrmEmployee } from "@/modules/hrm/types";
import { SK_ID_CARD_BRAND, SK_HEADER_GRADIENT, SK_ACCENT_GRADIENT } from "./hrm-id-card-brand";
import {
  resolveDepartmentLabel,
  resolveEmployeeDisplayId,
  resolveEmergencyContact,
  formatEmergencyContactLine,
} from "./hrm-id-card-fields";

/** ISO/IEC 7810 ID-1 (CR80) — 85.6 × 53.98 mm ≈ 3.375 × 2.125 in */
export const ID_CARD_WIDTH_PX = 338;
export const ID_CARD_HEIGHT_PX = 214;

export type HrmIdCardCompany = {
  brandName: string;
  logoUrl?: string | null;
  sealUrl?: string | null;
  address?: string | null;
};

function employeeInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function assetUrl(path?: string | null) {
  return path?.trim() ? resolveFileUrl(path.trim()) : "";
}

function photoUrl(employee: HrmEmployee) {
  return assetUrl(employee.avatarUrl ?? employee.image);
}

function IdCardPixels({ className }: { className?: string }) {
  const pixels = [
    SK_ID_CARD_BRAND.blueLight,
    SK_ID_CARD_BRAND.green,
    SK_ID_CARD_BRAND.orange,
    SK_ID_CARD_BRAND.red,
  ];
  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden>
      {pixels.map((color, i) => (
        <span
          key={i}
          className="size-[5px] rounded-[1px] opacity-90"
          style={{ backgroundColor: color, marginTop: i % 2 === 0 ? 0 : 4 }}
        />
      ))}
    </div>
  );
}

function IdCardBarcode({ code, className }: { code: string; className?: string }) {
  const bars = Array.from({ length: 36 }, (_, i) => {
    const n = (code.charCodeAt(i % code.length) + i * 7) % 5;
    return n === 0 || n === 1 ? 1 : n === 2 ? 2 : 3;
  });

  return (
    <div className={cn("flex shrink-0 items-end gap-[1px] h-6", className)} aria-hidden>
      {bars.map((w, i) => (
        <div
          key={i}
          className="rounded-[1px] bg-slate-800"
          style={{ width: w, height: w === 3 ? "100%" : w === 2 ? "76%" : "52%" }}
        />
      ))}
    </div>
  );
}

function IdCardShell({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-lg",
        "ring-1 ring-slate-200",
        "print:shadow-none print:ring-slate-300",
        className,
      )}
      style={{
        width: ID_CARD_WIDTH_PX,
        height: ID_CARD_HEIGHT_PX,
        backgroundColor: SK_ID_CARD_BRAND.lightCard,
        color: SK_ID_CARD_BRAND.textPrimary,
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgba(59,130,246,0.08) 0%, transparent 45%), radial-gradient(circle at 88% 92%, rgba(34,197,94,0.06) 0%, transparent 40%)",
        }}
      />
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[62px_1fr] gap-x-2 gap-y-0.5 items-baseline">
      <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-[9px] font-medium text-slate-800 leading-snug break-words">{value}</span>
    </div>
  );
}

export function HrmIdCardFront({
  employee,
  company,
  className,
  compact,
}: {
  employee: HrmEmployee;
  company: HrmIdCardCompany;
  className?: string;
  compact?: boolean;
}) {
  const code = resolveEmployeeDisplayId(employee);
  const department = resolveDepartmentLabel(employee);
  const logo = assetUrl(company.logoUrl);
  const scale = compact ? 0.68 : 1;

  return (
    <IdCardShell
      className={cn(compact && "origin-top-left", className)}
      style={
        compact
          ? { transform: `scale(${scale})`, marginBottom: -(ID_CARD_HEIGHT_PX * (1 - scale)) }
          : undefined
      }
    >
      <div className="relative z-[1] h-[56px] px-3.5 py-2.5" style={{ background: SK_HEADER_GRADIENT }}>
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_88%_12%,white,transparent_50%)]" />
        <div className="relative flex h-full items-center gap-2.5">
          {logo ? (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-white/40 shadow-sm">
              <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white ring-1 ring-white/25"
              style={{ background: SK_ACCENT_GRADIENT }}
            >
              SK
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.06em] leading-tight text-white">
              {company.brandName}
            </p>
            <p className="text-[7px] font-semibold uppercase tracking-[0.22em] text-white/75">
              Employee identity card
            </p>
          </div>
          <IdCardPixels />
        </div>
      </div>

      <div className="relative z-[1] flex gap-3.5 px-3.5 pt-3.5 pb-[52px]">
        <div className="shrink-0">
          <div className="rounded-xl p-[2px] shadow-lg" style={{ background: SK_ACCENT_GRADIENT }}>
            <Avatar className="size-[76px] rounded-[10px] bg-slate-100">
              {photoUrl(employee) ? (
                <AvatarImage src={photoUrl(employee)} alt={employee.name} className="object-cover" />
              ) : null}
              <AvatarFallback
                className="rounded-[10px] text-xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${SK_ID_CARD_BRAND.blue} 0%, ${SK_ID_CARD_BRAND.greenDark} 100%)`,
                }}
              >
                {employeeInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[16px] font-bold leading-tight tracking-tight text-slate-900">{employee.name}</p>
          <p
            className="text-[10px] font-bold uppercase tracking-wide leading-snug"
            style={{ color: SK_ID_CARD_BRAND.orangeDark }}
          >
            {employee.designation?.trim() || "Employee"}
          </p>
          {department !== "—" ? (
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{department}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {employee.bloodGroup?.trim() ? (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{ backgroundColor: SK_ID_CARD_BRAND.red }}
              >
                {employee.bloodGroup}
              </span>
            ) : null}
            {employee.joiningDate ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-medium text-slate-600 ring-1 ring-slate-200">
                Since {format(new Date(employee.joiningDate), "MMM yyyy")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-[1] px-3.5 py-2.5 border-t border-slate-200"
        style={{ backgroundColor: SK_ID_CARD_BRAND.lightPanel }}
      >
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: SK_ACCENT_GRADIENT }} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-semibold uppercase tracking-[0.22em] text-slate-500">Employee ID</p>
            <p className="font-mono text-[12px] font-bold tracking-wide text-slate-900 break-all leading-none mt-0.5">
              {code}
            </p>
          </div>
          <IdCardBarcode code={code} />
        </div>
      </div>
    </IdCardShell>
  );
}

export function HrmIdCardBack({
  employee,
  company,
  className,
  compact,
}: {
  employee: HrmEmployee;
  company: HrmIdCardCompany;
  className?: string;
  compact?: boolean;
}) {
  const code = resolveEmployeeDisplayId(employee);
  const contact = resolveEmergencyContact(employee);
  const seal = assetUrl(company.sealUrl);
  const logo = assetUrl(company.logoUrl);
  const scale = compact ? 0.68 : 1;

  const emergencyName = contact?.name?.trim() || "—";
  const emergencyPhone = contact?.phone?.trim() || employee.phoneNumber?.trim() || "—";
  const emergencyRelation =
    contact?.relation?.trim() || (contact ? "—" : employee.phoneNumber ? "Mobile" : "—");

  return (
    <IdCardShell
      className={cn(compact && "origin-top-left", className)}
      style={
        compact
          ? { transform: `scale(${scale})`, marginBottom: -(ID_CARD_HEIGHT_PX * (1 - scale)) }
          : undefined
      }
    >
      <div
        className="relative z-[1] h-[38px] px-3.5 py-2"
        style={{
          background: `linear-gradient(90deg, ${SK_ID_CARD_BRAND.greenDark} 0%, ${SK_ID_CARD_BRAND.blue} 100%)`,
        }}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">Emergency & contact</p>
      </div>

      <div className="relative z-[1] space-y-2.5 px-3.5 py-3 pb-[46px] text-[9px] leading-relaxed">
        <div className="space-y-1.5">
          <InfoRow label="Name" value={emergencyName} />
          <InfoRow label="Phone" value={emergencyPhone} />
          <InfoRow label="Relation" value={emergencyRelation} />
          {employee.email?.trim() ? <InfoRow label="Email" value={employee.email.trim()} /> : null}
        </div>

        <div className="border-t border-dashed border-slate-200 pt-2">
          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Issued by</p>
          <div className="mt-1.5 flex items-start gap-2">
            {logo ? (
              <img src={logo} alt="" className="mt-0.5 h-5 w-auto max-w-[52px] shrink-0 object-contain opacity-95" />
            ) : null}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-900 leading-tight">{company.brandName}</p>
              {company.address ? (
                <p className="mt-0.5 text-[8px] leading-snug text-slate-500">{company.address}</p>
              ) : null}
            </div>
          </div>
        </div>

        <p className="text-[7px] leading-snug text-slate-400 pr-14">
          Property of {company.brandName}. If found, please return to HR. Valid only while actively employed.
        </p>

        {seal ? (
          <img
            src={seal}
            alt="Official seal"
            className="pointer-events-none absolute right-3 bottom-11 h-[52px] w-[52px] object-contain opacity-80"
          />
        ) : null}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-[1] flex items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-2"
        style={{ backgroundColor: SK_ID_CARD_BRAND.lightPanel }}
      >
        <p className="font-mono text-[10px] font-bold text-slate-800 shrink-0">{code}</p>
        <p
          className="text-[7px] font-semibold uppercase tracking-wider text-right"
          style={{ color: SK_ID_CARD_BRAND.orangeDark }}
        >
          Authorized personnel
        </p>
      </div>
    </IdCardShell>
  );
}

export function HrmIdCardSheet({
  employee,
  company,
  className,
  showLabels = true,
}: {
  employee: HrmEmployee;
  company: HrmIdCardCompany;
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6",
        "print:border-0 print:bg-white print:p-0",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col items-center gap-2">
          {showLabels ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 print:hidden">
              Front
            </span>
          ) : null}
          <HrmIdCardFront employee={employee} company={company} />
        </div>
        <div className="flex flex-col items-center gap-2">
          {showLabels ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 print:hidden">
              Back
            </span>
          ) : null}
          <HrmIdCardBack employee={employee} company={company} />
        </div>
      </div>
    </div>
  );
}

export function HrmIdCardPreview({
  employee,
  company,
  className,
}: {
  employee: HrmEmployee;
  company: HrmIdCardCompany;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center overflow-hidden py-1", className)}>
      <HrmIdCardFront employee={employee} company={company} compact />
    </div>
  );
}

export function HrmIdCardViewButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 gap-1 text-[11px]", className)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Eye className="size-3.5" />
      View card
    </Button>
  );
}

export {
  resolveEmployeeDisplayId as employeeCode,
  formatEmergencyContactLine as formatEmergencyContact,
  resolveDepartmentLabel,
  formatEmergencyContactLine,
};

export { employeeInitials };
