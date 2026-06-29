import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  Mail,
  Phone,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useSalesTeamMember } from "@/api/sales";
import { formatCompactCurrency } from "@/modules/sales/constants";
import { LEAD_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/modules/sales/constants";
import { AvatarWithPresence } from "@/components/presence/AvatarWithPresence";
import { parsePresenceStatus } from "@/lib/presence";
import { getAdminEmployeeDetailHref } from "@/lib/employee-routes";
import { UserPresenceMeta } from "@/components/presence/UserPresenceMeta";
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
  const [tab, setTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useSalesTeamMember(userId, open && userId != null);

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

  return (
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
                  presenceStatus={member.presenceStatus as string | undefined}
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

              <TabsContent value="pipeline" className="space-y-4 mt-4">
                <div>
                  <p className="text-xs font-medium mb-2">Recent leads</p>
                  {(data?.recentLeads ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No assigned leads.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Lead</TableHead>
                            <TableHead className="text-[10px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data?.recentLeads.map((lead) => (
                            <TableRow key={lead.id}>
                              <TableCell className="text-xs">
                                <Link href={`/sales/leads/${lead.id}`} className="hover:underline font-medium">
                                  {lead.name}
                                </Link>
                                {lead.company ? (
                                  <p className="text-[10px] text-muted-foreground">{lead.company}</p>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-[10px]">
                                {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] ?? lead.status}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium mb-2">Recent proposals</p>
                  {(data?.recentProposals ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No assigned proposals.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Proposal</TableHead>
                            <TableHead className="text-[10px] text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data?.recentProposals.map((proposal) => (
                            <TableRow key={proposal.id}>
                              <TableCell className="text-xs">
                                <Link href={`/sales/proposals/${proposal.id}`} className="hover:underline font-medium">
                                  {proposal.title}
                                </Link>
                                <p className="text-[10px] text-muted-foreground">
                                  {PROPOSAL_STATUS_LABELS[proposal.status as keyof typeof PROPOSAL_STATUS_LABELS] ?? proposal.status}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">
                                {formatCompactCurrency(proposal.totalAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="followups" className="mt-4">
                {(data?.followUps ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No follow-ups scheduled.</p>
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
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
