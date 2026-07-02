import { Link } from "wouter";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  User,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HrmChartCard } from "./hrm-ui-kit";
import { formatCurrency } from "@/modules/finance/constants";
import { isPresentLikeStatus } from "@/modules/hrm/constants";
import { HrmAttendanceBadge, HrmWorkflowBadge, hrmActionButtonClass } from "./components";
import type { HrmAttendanceSummary, HrmEmployee, HrmEmployeeOverview, HrmLeaveBalance, HrmLeaveRequest } from "./types";
import { getLeaveBalanceAvailable, getLeaveBalanceCarriedForward } from "./employee-profile-types";
import {
  formatAddressLine,
  getEmployeeDisplayName,
} from "./employee-profile-types";

const CHART_TOOLTIP = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  fontSize: "11px",
  borderRadius: "8px",
};

const DONUT_COLORS = ["#22c55e", "#ef4444", "#6366f1", "#f59e0b", "#3b82f6", "#94a3b8", "#64748b"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function computeTenure(joiningDate?: string | null): string {
  if (!joiningDate) return "—";
  const joined = new Date(joiningDate);
  if (Number.isNaN(joined.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
  if (now.getDate() < joined.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0) return `${years}y ${rem}mo`;
  return `${rem}mo`;
}

export function workingAttendanceRows(rows: HrmAttendanceSummary[]) {
  return rows.filter((r) => !["weekend", "holiday"].includes(r.status));
}

export function attendanceRatePct(rows: HrmAttendanceSummary[]) {
  const working = workingAttendanceRows(rows);
  if (!working.length) return 0;
  const present = working.filter((r) => isPresentLikeStatus(r.status)).length;
  return Math.round((present / working.length) * 100);
}

export function totalWorkHours(rows: HrmAttendanceSummary[]) {
  const mins = rows.reduce((s, r) => s + (r.activeMinutes ?? 0), 0);
  return Math.round((mins / 60) * 10) / 10;
}

export function todayAttendanceRow(rows: HrmAttendanceSummary[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  return rows.find((r) => r.date === today);
}

function StatMini({
  label,
  value,
  hint,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "green" | "blue" | "violet" | "amber" | "rose" | "emerald";
}) {
  const accentMap = {
    green: "text-emerald-600 bg-emerald-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    violet: "text-violet-600 bg-violet-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
  };
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
            {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", accentMap[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeDetailToolbar({
  onRefresh,
  onEdit,
  onSendCredentials,
  refreshing,
  sendingCredentials,
  canEdit,
  backHref = "/hrm/employees",
  backLabel = "Back to employees",
}: {
  onRefresh: () => void;
  onEdit: () => void;
  onSendCredentials?: () => void;
  refreshing?: boolean;
  sendingCredentials?: boolean;
  canEdit?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" size="sm" className="h-8" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
        {canEdit && onSendCredentials ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onSendCredentials}
            disabled={sendingCredentials}
          >
            Send login credentials
          </Button>
        ) : null}
        {canEdit ? (
          <Button size="sm" className={hrmActionButtonClass("h-8")} onClick={onEdit}>
            Edit employee
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmployeeProfileHero({ employee }: { employee: HrmEmployee }) {
  const displayName = getEmployeeDisplayName(employee);
  const avatar = employee.avatarUrl ?? employee.image ?? null;
  const dept = employee.departmentName ?? employee.department ?? "Unassigned";
  const roleLabel = employee.designation ?? employee.role.replace(/_/g, " ");
  const hrStatus = employee.hrEmploymentStatus ?? employee.status;

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20 border-2 border-background shadow-md sm:h-24 sm:w-24">
            {avatar ? <AvatarImage src={avatar} alt={displayName} /> : null}
            <AvatarFallback className="text-lg font-semibold bg-violet-500/10 text-violet-700">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{displayName}</h1>
              <Badge
                variant={employee.status === "active" ? "default" : "secondary"}
                className={cn(
                  "capitalize text-[10px]",
                  employee.status === "active" && "bg-emerald-600 hover:bg-emerald-600",
                )}
              >
                {hrStatus}
              </Badge>
              {employee.employeeType ? (
                <Badge variant="outline" className="text-[10px]">
                  {employee.employeeType}
                </Badge>
              ) : null}
              {employee.employeeId ? (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {employee.employeeId}
                </Badge>
              ) : null}
            </div>
            {employee.bio ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{employee.bio}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                <Building2 className="h-3 w-3" /> {dept}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                <Briefcase className="h-3 w-3" /> {roleLabel}
              </span>
              {employee.position ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 capitalize">
                  {employee.position.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {employee.phoneNumber ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {employee.phoneNumber}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {employee.email}
              </span>
              {employee.joiningDate ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Joined {format(new Date(employee.joiningDate), "MMM d, yyyy")}
                </span>
              ) : null}
              {employee.dob ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  DOB {format(new Date(employee.dob), "MMM d, yyyy")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeePaidLeaveCard({
  balances,
  overviewBalances,
  monthlyQuota,
}: {
  balances: HrmLeaveBalance[];
  overviewBalances: HrmEmployeeOverview["leaveBalances"];
  monthlyQuota?: number | null;
}) {
  const elBalance =
    balances.find((b) => b.leaveType?.code === "EL") ??
    balances.find((b) => (b.leaveType?.isPaid ?? true) !== false) ??
    balances[0];

  const overviewEl = overviewBalances.find((b) => b.code === "EL");

  if (!elBalance && !overviewEl) {
    return (
      <Card className="border-border/60 shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Paid leave</CardTitle>
          <CardDescription className="text-xs">Leave balances will appear after accrual runs.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allocated = elBalance?.allocated ?? 0;
  const used = elBalance?.used ?? 0;
  const pending = elBalance?.pending ?? 0;
  const carry = getLeaveBalanceCarriedForward(elBalance ?? {});
  const available =
    elBalance != null
      ? getLeaveBalanceAvailable(elBalance)
      : (overviewEl?.available ?? 0);

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 shadow-sm lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Paid leave</CardTitle>
        <CardDescription className="text-xs">
          {monthlyQuota != null ? (
            <>
              Monthly quota:{" "}
              <span className="font-semibold text-foreground">
                {monthlyQuota} day{monthlyQuota === 1 ? "" : "s"}/month
              </span>
              {" · "}
            </>
          ) : null}
          Accrued balance. Available now:{" "}
          <span className="font-semibold text-foreground">{available} day{available === 1 ? "" : "s"}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Accrued", value: allocated + carry },
            { label: "Taken", value: used },
            { label: "Left", value: available },
            { label: "Pending", value: pending },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border/50 bg-background/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
        {allocated + carry > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Utilization</span>
              <span>{Math.round((used / (allocated + carry)) * 100)}%</span>
            </div>
            <Progress value={Math.min(100, (used / (allocated + carry)) * 100)} className="h-1.5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EmployeeTodayStatusCards({ todayRow }: { todayRow?: HrmAttendanceSummary }) {
  const checkedIn =
    todayRow && isPresentLikeStatus(todayRow.status) && (todayRow.activeMinutes ?? 0) > 0;
  const hours = todayRow ? Math.round(((todayRow.activeMinutes ?? 0) / 60) * 10) / 10 : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today · Check in</p>
            <p className="mt-1 text-sm font-semibold">{checkedIn ? `${hours}h logged` : "Not yet"}</p>
          </div>
          <Clock className="h-5 w-5 text-violet-500 opacity-80" />
        </CardContent>
      </Card>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today · Status</p>
            <p className="mt-1">
              {todayRow ? (
                <HrmAttendanceBadge status={todayRow.status} />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">Scheduled</span>
              )}
            </p>
          </div>
          <User className="h-5 w-5 text-blue-500 opacity-80" />
        </CardContent>
      </Card>
    </div>
  );
}

export function EmployeeDailyHoursChart({ rows }: { rows: HrmAttendanceSummary[] }) {
  const data = workingAttendanceRows(rows)
    .slice(-14)
    .map((r) => ({
      label: format(new Date(`${r.date}T12:00:00`), "MMM d"),
      hours: Math.round((r.activeMinutes / 60) * 10) / 10,
    }));

  if (!data.length) {
    return (
      <HrmChartCard title="Daily work hours" description="Last 14 working days">
        <p className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
          No attendance data for this period yet.
        </p>
      </HrmChartCard>
    );
  }

  return (
    <HrmChartCard title="Daily work hours" description="Hours logged per working day">
      <div className="h-[200px] w-full rounded-lg border border-border/40 bg-muted/10 p-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
            <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number) => [`${v}h`, "Hours"]} />
            <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </HrmChartCard>
  );
}

export function EmployeeAttendanceDonut({ rows }: { rows: HrmAttendanceSummary[] }) {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));

  if (!data.length) {
    return (
      <HrmChartCard title="Monthly attendance" description="Status mix this month">
        <p className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">No records yet.</p>
      </HrmChartCard>
    );
  }

  return (
    <HrmChartCard title="Monthly attendance" description="Status mix this month">
      <div className="flex h-[200px] items-center gap-4">
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="flex-1 space-y-1.5 text-xs">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 capitalize text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {d.name}
              </span>
              <span className="font-semibold tabular-nums">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </HrmChartCard>
  );
}

export function EmployeeSalaryBar({
  gross,
  net,
  source,
}: {
  gross?: number | null;
  net?: number | null;
  source?: string | null;
}) {
  const data = [
    { name: "Gross", amount: gross ?? 0 },
    { name: "Net", amount: net ?? 0 },
  ].filter((d) => d.amount > 0);

  if (!data.length) {
    return (
      <HrmChartCard title="Contract compensation" description="Monthly net salary used for payroll">
        <p className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
          No compensation configured — set salary in Admin → Team (Compensation tab).
        </p>
      </HrmChartCard>
    );
  }

  return (
    <HrmChartCard
      title="Contract compensation"
      description={
        source === "profile"
          ? "From team employee profile (used for payroll)"
          : source === "structure"
            ? "From payroll structure record"
            : "Monthly contract amounts"
      }
    >
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={48} />
            <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number) => [formatCurrency(v), "Amount"]} />
            <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </HrmChartCard>
  );
}

function ProfileDetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value?: React.ReactNode;
  href?: string | null;
}) {
  const empty = value == null || value === "" || value === "—";
  const content = empty ? "—" : value;
  return (
    <p className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {href && !empty ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary text-right text-xs hover:underline break-all"
        >
          {content}
        </a>
      ) : (
        <span className="text-right break-words">{content}</span>
      )}
    </p>
  );
}

function formatProfileDate(value?: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "PP");
  } catch {
    return "—";
  }
}

function addressesEqual(
  a?: { street?: string; city?: string; state?: string; country?: string; zipCode?: string } | null,
  b?: { street?: string; city?: string; state?: string; country?: string; zipCode?: string } | null,
) {
  const line = (addr?: typeof a) => formatAddressLine(addr);
  return line(a) === line(b);
}

export function EmployeeInfoGrid({ employee, overview }: { employee: HrmEmployee; overview: HrmEmployeeOverview }) {
  const contract = overview.contractSalary;
  const profileSalaryBasic = contract?.configured ? contract.basic : undefined;
  const profileAllowances = contract?.configured ? contract.allowances : undefined;
  const profileDeductions = contract?.configured ? contract.deductions : undefined;
  const profileSalaryNet = contract?.configured ? contract.net : undefined;
  const bank = employee.salary?.bankAccount;
  const linkedin = employee.linkedinUrl ?? employee.socialProfiles?.linkedin;
  const social = employee.socialProfiles ?? {};
  const permanent = employee.permanentAddress;
  const current = employee.currentAddress;
  const showBothAddresses =
    permanent && current && !addressesEqual(permanent, current);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contact & personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ProfileDetailRow label="Email" value={employee.email} />
          <ProfileDetailRow label="Phone" value={employee.phoneNumber} />
          <ProfileDetailRow
            label="Legal name"
            value={
              employee.firstName || employee.lastName
                ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
                : employee.name
            }
          />
          <ProfileDetailRow label="Date of birth" value={formatProfileDate(employee.dob)} />
          <ProfileDetailRow label="Gender" value={employee.gender} />
          <ProfileDetailRow label="Blood group" value={employee.bloodGroup || "—"} />
          <ProfileDetailRow label="Marital status" value={employee.maritalStatus} />
          <ProfileDetailRow
            label="Aadhar"
            value={employee.aadharNumber != null ? String(employee.aadharNumber) : "—"}
          />
          <ProfileDetailRow label="PAN" value={employee.panNumber} />
          {linkedin ? (
            <ProfileDetailRow label="LinkedIn" value="Open profile" href={linkedin} />
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Employment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ProfileDetailRow label="Department" value={employee.departmentName ?? employee.department} />
          <ProfileDetailRow label="Designation" value={employee.designation} />
          <ProfileDetailRow label="Sub-type" value={employee.subType} />
          <ProfileDetailRow label="Reporting manager" value={employee.reportingManagerName} />
          <ProfileDetailRow label="Team leader" value={employee.teamleaderName} />
          <ProfileDetailRow label="Shift" value={employee.shiftName ?? (employee.shiftId ? "Assigned" : "Company default")} />
          <ProfileDetailRow label="Employment type" value={employee.employeeType} />
          <ProfileDetailRow label="Position" value={employee.position?.replace(/_/g, " ")} />
          <ProfileDetailRow label="CMS role" value={employee.role.replace(/_/g, " ")} />
          <ProfileDetailRow label="HR status" value={employee.hrEmploymentStatus ?? employee.status} />
          <ProfileDetailRow label="Account status" value={employee.status} />
          <ProfileDetailRow label="Joined" value={formatProfileDate(employee.joiningDate)} />
          <ProfileDetailRow label="Probation ends" value={formatProfileDate(employee.probationEndDate)} />
          <ProfileDetailRow label="Exit date" value={formatProfileDate(employee.exitDate)} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {showBothAddresses ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Current</p>
                <p className="text-muted-foreground">{formatAddressLine(current)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Permanent</p>
                <p className="text-muted-foreground">{formatAddressLine(permanent)}</p>
              </div>
            </>
          ) : (
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{formatAddressLine(current ?? permanent)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ProfileDetailRow
            label="Basic salary"
            value={
              profileSalaryBasic != null
                ? formatCurrency(profileSalaryBasic)
                : overview.salaryGross != null
                  ? formatCurrency(overview.salaryGross)
                  : "—"
            }
          />
          <ProfileDetailRow
            label="Allowances"
            value={profileAllowances != null && profileAllowances > 0 ? formatCurrency(profileAllowances) : "—"}
          />
          <ProfileDetailRow
            label="Deductions"
            value={profileDeductions != null && profileDeductions > 0 ? formatCurrency(profileDeductions) : "—"}
          />
          <ProfileDetailRow
            label="Net pay"
            value={
              profileSalaryNet != null
                ? formatCurrency(profileSalaryNet)
                : overview.salaryNet != null
                  ? formatCurrency(overview.salaryNet)
                  : overview.latestPayrollNet != null
                    ? formatCurrency(overview.latestPayrollNet)
                    : "—"
            }
          />
          {contract?.configured && contract.source ? (
            <ProfileDetailRow
              label="Payroll source"
              value={contract.source === "profile" ? "Team profile" : "Payroll structure"}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bank account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ProfileDetailRow label="Account holder" value={bank?.accountHolderName} />
          <ProfileDetailRow label="Account number" value={bank?.accountNumber} />
          <ProfileDetailRow label="Bank" value={bank?.bankName} />
          <ProfileDetailRow label="Branch" value={bank?.branchName} />
          <ProfileDetailRow label="IFSC" value={bank?.ifsc} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">HRM policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ProfileDetailRow label="WFH limit / mo" value={`${employee.wfhMonthlyLimit ?? 4} days`} />
          <ProfileDetailRow
            label="Leave accrual"
            value={`${employee.leaveAccrualDaysPerMonth ?? employee.monthlyLeaveQuota ?? "Default"} / mo`}
          />
          <ProfileDetailRow label="Late charge" value={`${employee.lateChargePercentage ?? 100}%`} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm md:col-span-2 xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Social & documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Social profiles</p>
            <ProfileDetailRow label="Twitter" value={social.twitter} href={social.twitter} />
            <ProfileDetailRow label="Facebook" value={social.facebook} href={social.facebook} />
            <ProfileDetailRow label="Instagram" value={social.instagram} href={social.instagram} />
            <ProfileDetailRow label="Website" value={social.website} href={social.website} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Document links</p>
            <ProfileDetailRow
              label="Resume"
              value={employee.resumeUrl ? "View" : "—"}
              href={employee.resumeUrl ? resolveFileUrl(employee.resumeUrl) : undefined}
            />
            <ProfileDetailRow
              label="ID proof"
              value={employee.idProofUrl ? "View" : "—"}
              href={employee.idProofUrl ? resolveFileUrl(employee.idProofUrl) : undefined}
            />
            <ProfileDetailRow
              label="Address proof"
              value={employee.addressProofUrl ? "View" : "—"}
              href={employee.addressProofUrl ? resolveFileUrl(employee.addressProofUrl) : undefined}
            />
          </div>
          {employee.bio ? (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bio</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{employee.bio}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function EmployeeRecentLeaveList({ rows }: { rows: HrmLeaveRequest[] }) {
  const recent = [...rows].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 5);
  return (
    <HrmChartCard title="Recent leave" description="Latest applications">
      {recent.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No leave requests yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {r.startDate}
                  {r.endDate !== r.startDate ? ` – ${r.endDate}` : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">{r.leaveTypeName ?? r.leaveType?.name ?? "Leave"} · {r.days ?? "—"} days</p>
              </div>
              <HrmWorkflowBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </HrmChartCard>
  );
}

export function EmployeeRecentAttendanceList({ rows }: { rows: HrmAttendanceSummary[] }) {
  const recent = [...rows]
    .filter((r) => !["weekend", "holiday"].includes(r.status))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <HrmChartCard title="Recent attendance" description="Latest working days">
      {recent.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No attendance records yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {recent.map((r) => (
            <li key={r.date} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="text-muted-foreground">{format(new Date(`${r.date}T12:00:00`), "EEE, MMM d")}</span>
              <HrmAttendanceBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </HrmChartCard>
  );
}

export function EmployeeOverviewStats({
  overview,
  attendanceRows,
  employee,
}: {
  overview: HrmEmployeeOverview;
  attendanceRows: HrmAttendanceSummary[];
  employee: HrmEmployee;
}) {
  const rate = attendanceRatePct(attendanceRows);
  const hours = totalWorkHours(attendanceRows);
  const elAvailable =
    overview.leaveBalances.find((b) => b.code === "EL")?.available ??
    overview.leaveBalances.reduce((n, b) => n + b.available, 0);
  const leaveAvailable = elAvailable;
  const netPay =
    overview.latestPayrollNet != null
      ? formatCurrency(overview.latestPayrollNet)
      : overview.salaryNet != null
        ? formatCurrency(overview.salaryNet)
        : "—";

  return (
    <>
      <StatMini label="Attendance rate" value={`${rate}%`} hint="This month" icon={User} accent="green" />
      <StatMini label="Work hours" value={`${hours}h`} hint="This month" icon={Clock} accent="blue" />
      <StatMini label="Leave available" value={leaveAvailable} hint="Paid days left" icon={Calendar} accent="violet" />
      <StatMini label="Pending leave" value={overview.pendingLeave} icon={Briefcase} accent="amber" />
      <StatMini label="Net salary" value={netPay} icon={Wallet} accent="emerald" />
      <StatMini label="Tenure" value={computeTenure(employee.joiningDate)} icon={Building2} accent="rose" />
    </>
  );
}
