import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Users,
  CheckSquare,
  Target,
  Plus,
  Search,
  Trophy,
  Mail,
  LogIn,
  Pencil,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PortalPageShell, PortalKpiGrid, PortalTabsList, PortalTabsTrigger } from "@/components/layout/portal-page-kit";
import { useMarketingDashboard, useMarketingPerformance } from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingFilterBar,
  MarketingConfirmDialog,
} from "@/modules/marketing/components";
import { MarketingListPageSkeleton } from "@/components/loading";
import { useAuth } from "@/contexts/AuthContext";
import { BdeTeamFormDialog } from "@/modules/sales/team/BdeTeamFormDialog";
import { useDeleteUser, type User } from "@/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function DigitalTeam() {
  const queryClient = useQueryClient();
  const { user: viewer, impersonate, isImpersonating } = useAuth();
  const isAdmin = viewer?.role === "super_admin" || viewer?.role === "hr";

  const [activeTab, setActiveTab] = useState("roster");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const { data: dashboardData, isLoading: dashLoading, refetch } = useMarketingDashboard();
  const { data: perfData, isLoading: perfLoading } = useMarketingPerformance();
  const deleteUserMutation = useDeleteUser();

  const digitalTeam = dashboardData?.digitalTeam ?? [];
  const perfMembers = perfData?.members ?? [];

  const filteredTeam = useMemo(() => {
    if (!search.trim()) return digitalTeam;
    const q = search.toLowerCase();
    return digitalTeam.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.designation.toLowerCase().includes(q),
    );
  }, [digitalTeam, search]);

  const kpis = useMemo(() => {
    const totalMembers = digitalTeam.length;
    const totalActiveTasks = digitalTeam.reduce((sum, m) => sum + (m.openTasksCount || 0), 0);
    const totalDoneTasks = digitalTeam.reduce((sum, m) => sum + (m.doneTasksCount || 0), 0);
    const topPerformer = perfMembers.reduce<(typeof perfMembers)[number] | null>((best, m) => {
      if (!best || m.tasksCompleted > best.tasksCompleted) return m;
      return best;
    }, null);

    return {
      totalMembers,
      totalActiveTasks,
      totalDoneTasks,
      topPerformerName: topPerformer?.name ?? "—",
    };
  }, [digitalTeam, perfMembers]);

  const handleCreate = () => {
    setEditUser(null);
    setFormOpen(true);
  };

  const handleEdit = (m: (typeof digitalTeam)[number]) => {
    setEditUser({
      id: m.id,
      name: m.name,
      email: m.email,
      role: "digital",
      status: m.status as any,
      createdAt: "",
    } as User);
    setFormOpen(true);
  };

  const handleViewAs = async (m: (typeof digitalTeam)[number]) => {
    if (isImpersonating) {
      toast.error("Exit the current view-as session first.");
      return;
    }
    setImpersonatingId(m.id);
    try {
      await impersonate(m.id);
      toast.success(`Viewing workspace as ${m.name}`);
    } catch (err: unknown) {
      toastApiError(err, "Failed to view as specialist");
    } finally {
      setImpersonatingId(null);
    }
  };

  const confirmDelete = (m: (typeof digitalTeam)[number]) => {
    setDeleteId(m.id);
    setDeleteName(m.name);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteUserMutation.mutateAsync({ id: deleteId });
      toast.success(`Digital Specialist "${deleteName}" deactivated`);
      setDeleteId(null);
      setDeleteName("");
      void refetch();
      queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
    } catch (err: unknown) {
      toastApiError(err, "Failed to delete specialist");
    }
  };

  const isLoading = dashLoading || perfLoading;

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Digital Team"
        description="Manage Digital Specialists, view specialist workspaces, track assigned workload, and evaluate performance."
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Digital Team" }]}
        actions={
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <PortalTabsList>
                <PortalTabsTrigger value="roster">Roster ({digitalTeam.length})</PortalTabsTrigger>
                <PortalTabsTrigger value="performance">Performance</PortalTabsTrigger>
              </PortalTabsList>
            </Tabs>
            {isAdmin && (
              <Button size="sm" onClick={handleCreate} className="h-9 gap-1.5 font-medium shadow-sm">
                <Plus className="h-4 w-4" /> Add Specialist
              </Button>
            )}
          </div>
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Digital Specialists", value: kpis.totalMembers, icon: Users, accent: "blue", delay: 0 },
          { title: "Active Assigned Tasks", value: kpis.totalActiveTasks, icon: CheckSquare, accent: "blue", delay: 1 },
          { title: "Total Deliverables Done", value: kpis.totalDoneTasks, icon: Target, accent: "green", delay: 2 },
          { title: "Top Specialist", value: kpis.topPerformerName, icon: Trophy, accent: "violet", delay: 3 },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* ROSTER TAB */}
        <TabsContent value="roster" className="mt-4 space-y-4">
          <MarketingFilterBar>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search specialists by name, email, or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </MarketingFilterBar>

          {isLoading ? (
            <MarketingListPageSkeleton kpiCount={4} showTabs={false} />
          ) : filteredTeam.length === 0 ? (
            <MarketingEmptyState
              icon={Users}
              title="No Digital Specialists found"
              description={
                search
                  ? "Try matching name, email, or designation."
                  : "Add users with the Digital Specialist role to see them here."
              }
              actionLabel={isAdmin ? "Add Specialist" : undefined}
              onAction={handleCreate}
            />
          ) : (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Specialist</TableHead>
                    <TableHead className="text-xs">Role / Designation</TableHead>
                    <TableHead className="text-xs">Active Tasks</TableHead>
                    <TableHead className="text-xs text-right">Completed</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeam.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-700 font-semibold text-xs dark:bg-teal-500/20 dark:text-teal-400">
                            {m.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-foreground leading-snug">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {m.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground">{m.designation}</span>
                          <span className="inline-flex items-center w-fit rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-400">
                            Digital Specialist
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-900/50">
                          {m.openTasksCount} active
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                        {m.doneTasksCount} done
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Tasks Shortcut */}
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" asChild>
                            <Link href={`/marketing/tasks?assigneeId=${m.id}`}>
                              <CheckSquare className="h-3.5 w-3.5 text-blue-500" /> Tasks
                            </Link>
                          </Button>

                          {/* View As (Impersonate) Button */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-500/10 border-amber-200 dark:text-amber-400 dark:border-amber-900/50"
                              disabled={impersonatingId === m.id || isImpersonating}
                              onClick={() => void handleViewAs(m)}
                            >
                              {impersonatingId === m.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <LogIn className="h-3.5 w-3.5" />
                              )}
                              View as
                            </Button>
                          )}

                          {/* Edit Button */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleEdit(m)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit
                            </Button>
                          )}

                          {/* Delete Button */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-200 dark:text-red-400 dark:border-red-900/50"
                              onClick={() => confirmDelete(m)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="mt-4">
          {perfMembers.length === 0 ? (
            <MarketingEmptyState
              icon={Users}
              title="No team performance metrics yet"
              description="Assign tasks to Digital Specialists to see efficiency & delivery metrics."
            />
          ) : (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Digital Specialist</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs text-right">Tasks Completed</TableHead>
                    <TableHead className="text-xs text-right">Avg Delivery Time</TableHead>
                    <TableHead className="text-xs text-center">Quality Score</TableHead>
                    <TableHead className="text-xs">Productivity</TableHead>
                    <TableHead className="text-xs text-right">Late %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="py-3 font-semibold text-xs">{m.name}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">Digital Specialist</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-xs font-semibold">{m.tasksCompleted}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-xs text-muted-foreground">
                        {m.avgDeliveryDays} days
                      </TableCell>
                      <TableCell className="py-3 text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {m.clientRating.toFixed(1)} / 5.0
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={m.productivityPct} className="h-1.5 flex-1" />
                          <span className="text-xs tabular-nums font-semibold">{m.productivityPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-xs font-medium text-amber-700 dark:text-amber-400">
                        {m.lateDeliveryPct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Specialist Modal */}
      {formOpen && (
        <BdeTeamFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editUser={editUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      <MarketingConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeleteName("");
          }
        }}
        title="Deactivate Digital Specialist"
        description={`Are you sure you want to deactivate "${deleteName}"? They will lose access to the Digital portal.`}
        confirmLabel="Deactivate"
        loading={deleteUserMutation.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
