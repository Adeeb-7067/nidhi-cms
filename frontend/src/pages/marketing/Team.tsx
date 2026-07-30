import { useState, useMemo } from "react";
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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CmsChipTabs, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMarketingDashboard, useMarketingPerformance } from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingFilterBar,
  MarketingConfirmDialog,
  MarketingRowActions,
} from "@/modules/marketing/components";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/modules/permissions/usePermission";
import { BdeTeamFormDialog } from "@/modules/sales/team/BdeTeamFormDialog";
import { useDeleteUser, type User } from "@/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function DigitalTeam() {
  const queryClient = useQueryClient();
  const { user: viewer, impersonate, isImpersonating } = useAuth();
  const { can } = usePermissions();
  const isAdmin = viewer?.role === "super_admin" || viewer?.role === "hr";
  const canEditTeam = can("admin_team", "edit") || isAdmin;
  const canDeleteTeam = can("admin_team", "delete") || isAdmin;

  const [activeTab, setActiveTab] = useState("roster");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const { data: dashboardData, isLoading: dashLoading, isError: dashError, refetch: refetchDash } = useMarketingDashboard();
  const { data: perfData, isLoading: perfLoading, isError: perfError, refetch: refetchPerf } = useMarketingPerformance();
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
      status: m.status as User["status"],
      avatarUrl: m.avatarUrl ?? null,
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
      void refetchDash();
      queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
    } catch (err: unknown) {
      toastApiError(err, "Failed to delete specialist");
    }
  };

  const isLoading = dashLoading || perfLoading;


  const teamColumns: CmsColumn<(typeof filteredTeam)[number]>[] = [
    {
      id: "specialist",
      header: "Specialist",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/60">
            {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt={m.name} className="object-cover" /> : null}
            <AvatarFallback className="bg-teal-500/10 text-teal-700 text-[10px] font-semibold dark:bg-teal-500/20 dark:text-teal-400">
              {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-xs text-foreground leading-snug">{m.name}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> {m.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role / Designation",
      cell: (m) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">{m.designation}</span>
          <span className="inline-flex items-center w-fit rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-400">
            Digital Specialist
          </span>
        </div>
      ),
    },
    {
      id: "active",
      header: "Active Tasks",
      chip: true,
      cell: (m) => (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-900/50">
          {m.openTasksCount} active
        </Badge>
      ),
    },
    {
      id: "done",
      header: "Completed",
      align: "right",
      cell: (m) => (
        <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          {m.doneTasksCount} done
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      chip: true,
      cell: () => <CmsStatusChip label="Active" tone="success" dot />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (m) => (
        <MarketingRowActions
          label={`${m.name} actions`}
          items={[
            {
              label: "Tasks",
              icon: CheckSquare,
              href: `/marketing/tasks?assigneeId=${m.id}`,
            },
            {
              label: "View as",
              icon: LogIn,
              onSelect: () => void handleViewAs(m),
              disabled: impersonatingId === m.id || isImpersonating,
              hidden: !isAdmin,
            },
            {
              label: "Edit",
              icon: Pencil,
              onSelect: () => handleEdit(m),
              hidden: !canEditTeam,
            },
            {
              label: "Delete",
              icon: Trash2,
              onSelect: () => confirmDelete(m),
              variant: "destructive",
              separatorBefore: true,
              hidden: !canDeleteTeam,
            },
          ]}
        />
      ),
    },
  ];

  const perfColumns: CmsColumn<(typeof perfMembers)[number]>[] = [
    { id: "name", header: "Digital Specialist", cell: (m) => <span className="font-semibold">{m.name}</span> },
    { id: "role", header: "Role", cell: () => <span className="text-muted-foreground">Digital Specialist</span> },
    { id: "done", header: "Tasks Completed", align: "right", cell: (m) => <span className="tabular-nums font-semibold">{m.tasksCompleted}</span> },
    { id: "avg", header: "Avg Delivery Time", align: "right", cell: (m) => <span className="tabular-nums text-muted-foreground">{m.avgDeliveryDays} days</span> },
    { id: "quality", header: "Quality Score", align: "center", cell: (m) => <span className="font-semibold text-amber-600 dark:text-amber-400">{m.clientRating.toFixed(1)} / 5.0</span> },
    {
      id: "prod",
      header: "Productivity",
      cell: (m) => (
        <div className="flex items-center gap-2">
          <Progress value={m.productivityPct} className="h-1.5 flex-1" />
          <span className="tabular-nums font-semibold">{m.productivityPct}%</span>
        </div>
      ),
    },
    { id: "late", header: "Late %", align: "right", cell: (m) => <span className="tabular-nums font-medium text-amber-700 dark:text-amber-400">{m.lateDeliveryPct}%</span> },
  ];

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Digital Team"
        description="Manage Digital Specialists, view specialist workspaces, track assigned workload, and evaluate performance."
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Digital Team" }]}
        actions={
          canEditTeam ? (
            <Button size="sm" onClick={handleCreate} className="h-9 gap-1.5 font-medium shadow-sm">
              <Plus className="h-4 w-4" /> Add Specialist
            </Button>
          ) : undefined
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

      <CmsChipTabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { value: "roster", label: "Roster", count: digitalTeam.length },
          { value: "performance", label: "Performance" },
        ]}
      />

      {activeTab === "roster" ? (
        <div className="space-y-4">
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

          {!dashLoading && filteredTeam.length === 0 ? (
            <MarketingEmptyState
              icon={Users}
              title="No Digital Specialists found"
              description={
                search
                  ? "Try matching name, email, or designation."
                  : "Add users with the Digital Specialist role to see them here."
              }
              actionLabel={canEditTeam ? "Add Specialist" : undefined}
              onAction={handleCreate}
            />
          ) : (
            <CmsDataTable
              columns={teamColumns}
              rows={filteredTeam}
              rowKey={(m) => m.id}
              isLoading={dashLoading}
              error={dashError}
              onRetry={() => refetchDash()}
            />
          )}
        </div>
      ) : !perfLoading && perfMembers.length === 0 ? (
        <MarketingEmptyState
          icon={Users}
          title="No team performance metrics yet"
          description="Assign tasks to Digital Specialists to see efficiency & delivery metrics."
        />
      ) : (
        <CmsDataTable
          columns={perfColumns}
          rows={perfMembers}
          rowKey={(m) => m.id}
          isLoading={perfLoading}
          error={perfError}
          onRetry={() => refetchPerf()}
        />
      )}

      {/* Add / Edit Specialist Modal */}
      {formOpen && (
        <BdeTeamFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editUser={editUser}
          fixedRole="digital"
          onSaved={() => {
            void refetchDash();
            queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
          }}
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
