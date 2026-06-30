import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  Plus,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useSalesTeamMember, useBdeTargets, type BdeTarget } from "@/api/sales";
import { formatCompactCurrency } from "@/modules/sales/constants";
import { LEAD_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/modules/sales/constants";
import { AvatarWithPresence } from "@/components/presence/AvatarWithPresence";
import { parsePresenceStatus } from "@/lib/presence";
import { getAdminEmployeeDetailHref } from "@/lib/employee-routes";
import { UserPresenceMeta } from "@/components/presence/UserPresenceMeta";
import { useAuth } from "@/contexts/AuthContext";
import { BdeTargetDialog } from "./BdeTargetDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function BdeMemberSheet({
  userId,
  open,
  onOpenChange,
  onEdit,
}: {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (userId: number) => void;
}) {
  const { user } = useAuth();
  const isAdmin = (user?.role as string) === "super_admin" || (user?.role as string) === "hr";

  const [tab, setTab] = useState("overview");
  const [, setLocation] = useLocation();
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<BdeTarget | null>(null);
  const [editingMonth, setEditingMonth] = useState<number>(new Date().getMonth() + 1);
  const [editingYear, setEditingYear] = useState<number>(new Date().getFullYear());

  const { data, isLoading, isError } = useSalesTeamMember(userId, open && userId != null);
  const { data: targetsData, isLoading: targetsLoading } = useBdeTargets(
    userId,
    targetYear,
    open && userId != null && tab === "targets",
  );

  const member = data?.member;
  const stats = data?.stats;

  const leadStatusRows = useMemo(
    () => (data?.leadsByStatus ?? []).filter((r) => r.count > 0),
    [data?.leadsByStatus],
  );
  const proposalStatusRows = useMemo(
    () => (data?.proposalsByStatus ?? []).filter((r) => r.count > 0),
    [data?.proposalsByStatus],
  );

  // Build a map of month → target for the current year
  const targetByMonth = useMemo(() => {
    const map = new Map<number, BdeTarget>();
    for (const t of targetsData?.targets ?? []) map.set(t.month, t);
    return map;
  }, [targetsData?.targets]);

  function openSetTarget(month: number, existing: BdeTarget | null) {
    setEditingMonth(month);
    setEditingYear(targetYear);
    setEditingTarget(existing);
    setTargetDialogOpen(true);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !member ? (
          <div className="pt-6 text-sm text-muted-foreground">Could not load team member details.</div>
        ) : (
          <>
            <SheetHeader className="text-left space-y-3">
              <div className="flex items-start gap-3">
                <AvatarWithPresence
                  name={String(member.name ?? "")}
                  avatarUrl={(member.avatarUrl as string | null) ?? null}
                  presenceStatus={member.presenceStatus as "online" | "away" | "offline" | undefined}
                  avatarClassName="h-12 w-12"
                />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base">{String(member.name)}</SheetTitle>
                  <SheetDescription className="flex flex-col gap-0.5 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3" />
                      {String(member.email)}
                    </span>
                    {member.employeeId ? (
                      <span className="font-mono text-[10px]">{String(member.employeeId)}</span>
                    ) : null}
                  </SheetDescription>
                  <div className="mt-2">
                    <UserPresenceMeta
                      presenceStatus={parsePresenceStatus(member.presenceStatus)}
                      lastSeenAt={member.lastSeenAt as string | null | undefined}
                      lastLoginAt={member.lastLoginAt as string | null | undefined}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {userId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      setLocation(getAdminEmployeeDetailHref(userId));
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View full profile
                  </Button>
                ) : null}
                {onEdit && userId ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(userId)}>
                    Edit profile
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <Tabs value={tab} onValueChange={setTab} className="mt-6">
              <TabsList className="h-9 flex-wrap">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
                <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
                <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
                <TabsTrigger value="targets" className="text-xs">Targets</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {String(member.status ?? "active")}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Designation</p>
                    <p className="text-sm font-medium mt-1">{String(member.designation ?? "BDE")}</p>
                  </div>
                  {member.phoneNumber ? (
                    <div className="rounded-lg border p-3 col-span-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p className="text-sm font-medium mt-1 inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {String(member.phoneNumber)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> Revenue
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{formatCompactCurrency(stats?.revenue ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3" /> Deals closed
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{stats?.dealsClosed ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Leads
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{stats?.leadCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Proposals
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{stats?.proposalCount ?? 0}</p>
                  </div>
                </div>
                {leadStatusRows.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium mb-2">Leads by status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {leadStatusRows.map((r) => (
                        <Badge key={r.status} variant="secondary" className="text-[10px]">
                          {LEAD_STATUS_LABELS[r.status as keyof typeof LEAD_STATUS_LABELS] ?? r.status}: {r.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {proposalStatusRows.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium mb-2">Proposals by status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {proposalStatusRows.map((r) => (
                        <Badge key={r.status} variant="secondary" className="text-[10px]">
                          {PROPOSAL_STATUS_LABELS[r.status as keyof typeof PROPOSAL_STATUS_LABELS] ?? r.status}: {r.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="pipeline" className="mt-4">
                {data?.recentLeads && data.recentLeads.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium mb-3">Recent leads</p>
                    {data.recentLeads.map((lead) => (
                      <Link key={lead.id} href={`/sales/leads/${lead.id}`}>
                        <div className="rounded-lg border p-3 text-xs space-y-1 hover:border-primary/30">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{lead.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{lead.status}</Badge>
                          </div>
                          {lead.company ? <p className="text-[10px] text-muted-foreground">{lead.company}</p> : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No recent leads.</p>
                )}
              </TabsContent>

              <TabsContent value="followups" className="mt-4">
                {!data?.followUps || data.followUps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending follow-ups.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.followUps.map((fu) => (
                      <div key={fu.id} className="rounded-lg border p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium capitalize">{fu.type}</span>
                          <Badge variant="outline" className="text-[10px]">{fu.status}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {fu.scheduledAt ? new Date(fu.scheduledAt).toLocaleString() : "—"}
                        </p>
                        {fu.notes ? <p className="text-[10px] text-muted-foreground">{fu.notes}</p> : null}
                        <Link href={`/sales/leads/${fu.leadId}`} className="text-[10px] text-primary hover:underline">
                          View lead
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Targets Tab ── */}
              <TabsContent value="targets" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Monthly targets for {String(member.name).split(" ")[0]}</p>
                  <Select
                    value={String(targetYear)}
                    onValueChange={(v) => setTargetYear(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {targetsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Month</TableHead>
                        <TableHead className="text-xs text-right">Revenue</TableHead>
                        <TableHead className="text-xs text-right">Deals</TableHead>
                        <TableHead className="text-xs text-right">Leads</TableHead>
                        {isAdmin ? <TableHead className="text-xs w-8" /> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MONTH_NAMES.map((name, i) => {
                        const month = i + 1;
                        const target = targetByMonth.get(month);
                        const isCurrentMonth =
                          month === new Date().getMonth() + 1 && targetYear === currentYear;
                        return (
                          <TableRow
                            key={month}
                            className={isCurrentMonth ? "bg-primary/5 font-medium" : undefined}
                          >
                            <TableCell className="text-xs py-2">
                              {name.slice(0, 3)}
                              {isCurrentMonth ? (
                                <Badge variant="secondary" className="ml-1.5 text-[9px] py-0 px-1">Now</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums py-2">
                              {target?.revenueTarget != null
                                ? formatCompactCurrency(target.revenueTarget)
                                : <span className="text-muted-foreground/50">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums py-2">
                              {target?.dealsTarget != null
                                ? target.dealsTarget
                                : <span className="text-muted-foreground/50">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums py-2">
                              {target?.leadsTarget != null
                                ? target.leadsTarget
                                : <span className="text-muted-foreground/50">—</span>}
                            </TableCell>
                            {isAdmin ? (
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => openSetTarget(month, target ?? null)}
                                  title={target ? "Edit target" : "Set target"}
                                >
                                  {target ? (
                                    <Pencil className="h-3 w-3" />
                                  ) : (
                                    <Plus className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </Button>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

                {!isAdmin ? (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Targets are set by your admin.
                  </p>
                ) : null}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>

    {isAdmin && userId && member ? (
      <BdeTargetDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        userId={userId}
        bdeNam={String(member.name)}
        existingTarget={editingTarget}
        defaultMonth={editingMonth}
        defaultYear={editingYear}
      />
    ) : null}
  </>
  );
}

// Re-export dialog for use elsewhere
export { BdeTargetDialog } from "./BdeTargetDialog";
