import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListUsers,
  useDeleteUser,
  getListUsersQueryKey,
  useGetTeamAnalytics,
  getGetTeamAnalyticsQueryKey,
  useGetUserCredentials,
  useRevealCredential,
  getGetUserCredentialsQueryKey,
  useGetLogComplianceCalendar,
  getGetLogComplianceCalendarQueryKey,
} from "@/api";
import { useTeamEmployeeProfile, useSaveTeamEmployee } from "@/api/team-employees";
import { LogComplianceCalendarPanel } from "@/components/logs/LogComplianceCalendar";
import { TeamAnalyticsPanel } from "@/components/team/TeamAnalyticsPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { useClientPagination, useTablePagination } from "@/lib/table-pagination";
import { Search, Plus, Mail, Clock, Trash2, Edit, BarChart3, Users as UsersIcon, Award, Zap, Eye, EyeOff, Key, ShieldCheck, Building, Phone, Calendar, Briefcase, Linkedin, ExternalLink, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/contexts/PresenceContext";
import { useRefreshPresenceForUserIds } from "@/hooks/use-presence-refresh";
import { AvatarWithPresence } from "@/components/presence/AvatarWithPresence";
import { UserPresenceMeta } from "@/components/presence/UserPresenceMeta";
import { formatLastLogin, mergeUserPresence, parsePresenceStatus } from "@/lib/presence";
import { PresenceTableCell } from "@/components/presence/PresenceTableCell";
import { useMergedPresenceForUser } from "@/hooks/use-merged-presence";
import { getAccessToken } from "@/lib/auth-storage";
import { apiUrl } from "@/lib/api-base";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AdvancedTable, Column } from "@/components/ui/advanced-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  PortalTabsList,
  PortalTabsTrigger,
  PortalContentCard,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { PageTableSkeleton } from "@/components/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { listQueryOptions, referenceQueryOptions } from "@/lib/list-query-options";
import { LIST_LIMIT, QUERY_STALE } from "@/lib/query-config";
import { LIST_COUNT_PARAMS, selectListTotal } from "@/hooks/use-list-totals";
import { useQueryClient } from "@tanstack/react-query";
import {
  formatStaffRoleLabel,
  isStaffEmployeeRole,
  staffRoleBadgeClass,
} from "@/lib/user-roles";
import { useHrmDepartments, useHrmShiftTemplates } from "@/api/hrm";
import { useRoleTemplates, useAssignableCmsRoles } from "@/api/permissions";
import { User } from "@/api";
import { cn } from "@/lib/utils";
import {
  teamEmployeeSchema,
  defaultTeamEmployeeFormValues,
  mapUserToTeamEmployeeForm,
  storedRoleTemplateId,
  teamEmployeeEditHydrateKey,
  type TeamEmployeeFormValues,
} from "@/modules/admin/employee-form-shared";
import {
  EmployeeFormTabs,
  EMPLOYEE_FORM_TAB_META,
  nextEmployeeFormTab,
  prevEmployeeFormTab,
  type EmployeeFormTab,
} from "@/components/admin/EmployeeFormTabs";
import { getStaffProfileHref } from "@/lib/employee-routes";

type EmployeeFormValues = TeamEmployeeFormValues;

function canViewAsEmployee(user: User): boolean {
  return user.status === "active" && isStaffEmployeeRole(user.role);
}

function employeeRoleLabel(role: string): string {
  return formatStaffRoleLabel(role);
}

function employeeRoleBadgeClass(role: string): string {
  return staffRoleBadgeClass(role);
}

function EmployeePresenceCell({ user }: { user: User }) {
  const merged = useMergedPresenceForUser(user);
  if (!merged) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastSeenAt={merged.lastSeenAt}
      lastLoginAt={merged.lastLoginAt}
      variant="presence"
    />
  );
}

function EmployeeLastSeenCell({ user }: { user: User }) {
  const merged = useMergedPresenceForUser(user);
  if (!merged) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastSeenAt={merged.lastSeenAt}
      variant="lastSeen"
    />
  );
}

function EmployeeLastLoginCell({ user }: { user: User }) {
  const merged = useMergedPresenceForUser(user);
  if (!merged) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastLoginAt={merged.lastLoginAt}
      variant="lastLogin"
    />
  );
}

function EmployeePresenceDetailCell({ user }: { user: User }) {
  const merged = useMergedPresenceForUser(user);
  if (!merged) return "—";
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastSeenAt={merged.lastSeenAt}
      lastLoginAt={merged.lastLoginAt}
      variant="combined"
    />
  );
}

export default function AdminEmployees() {
  const [, setLocation] = useLocation();
  const { impersonate, isImpersonating, user: viewer } = useAuth();
  const { getPresence } = usePresence();
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const [previewEmployeeId, setPreviewEmployeeId] = useState("");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeFormTab, setEmployeeFormTab] = useState<EmployeeFormTab>("personal");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, resetPage]);

  const listParams = {
    staff: "1",
    search,
    page,
    limit: apiLimit,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  } as Parameters<typeof useListUsers>[0];
  const { data, isLoading } = useListUsers(listParams, {
    query: listQueryOptions({
      queryKey: getListUsersQueryKey(listParams),
    }),
  });

  const pageUserIds = useMemo(() => data?.users?.map((u) => u.id) ?? [], [data?.users]);
  useRefreshPresenceForUserIds(pageUserIds);
  const staffCountParams = { staff: "1" as const, ...LIST_COUNT_PARAMS };
  const { data: staffTotal = 0, isLoading: staffTotalLoading } = useListUsers(staffCountParams, {
    query: {
      queryKey: getListUsersQueryKey(staffCountParams),
      staleTime: QUERY_STALE.reference,
      select: selectListTotal,
    },
  });
  const staffSummaryParams = { staff: "1" as const, page: 1, limit: LIST_LIMIT.admin };
  const { data: staffSummary, isLoading: staffSummaryLoading } = useListUsers(staffSummaryParams, {
    query: {
      queryKey: [...getListUsersQueryKey(staffSummaryParams), "kpiSummary"],
      staleTime: QUERY_STALE.reference,
    },
  });
  const now = new Date();
  const { data: teamAnalytics } = useGetTeamAnalytics(
    { month: now.getMonth() + 1, year: now.getFullYear() },
    {
      query: {
        queryKey: getGetTeamAnalyticsQueryKey({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
        staleTime: QUERY_STALE.analytics,
        enabled: activeTab === "list" || activeTab === "analytics",
      },
    },
  );

  const teamStats = useMemo(() => {
    const users = (staffSummary?.users ?? []).filter(
      (u) => isStaffEmployeeRole(u.role),
    );
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status !== "active").length;
    const devs = teamAnalytics?.developers ?? [];
    const avgUtilization =
      devs.length > 0
        ? Math.round(devs.reduce((sum, d) => sum + (d.utilisationPct ?? 0), 0) / devs.length)
        : 0;
    return {
      total: staffTotal,
      active,
      inactive,
      avgUtilization,
    };
  }, [staffSummary, staffTotal, teamAnalytics]);
  const statsLoading = staffTotalLoading || staffSummaryLoading;
  const saveTeamEmployee = useSaveTeamEmployee();
  const deleteUserMutation = useDeleteUser();
  const { data: hrmDepartmentsData } = useHrmDepartments();
  const { data: shiftTemplatesData } = useHrmShiftTemplates();
  const { data: roleTemplatesData } = useRoleTemplates();
  const { data: assignableRolesData } = useAssignableCmsRoles(isDialogOpen || !!editUser);
  const { data: managerPoolData } = useListUsers(
    { staff: "1", limit: 200 },
    {
      query: referenceQueryOptions({
        queryKey: getListUsersQueryKey({ staff: "1", limit: 200 }),
        enabled: isDialogOpen || !!editUser,
      }),
    },
  );
  const roleTemplateOptions = useMemo(
    () => roleTemplatesData?.templates ?? [],
    [roleTemplatesData?.templates],
  );
  const cmsRoleOptions = useMemo(
    () => assignableRolesData?.roles ?? [],
    [assignableRolesData?.roles],
  );
  const shiftTemplates = useMemo(
    () => shiftTemplatesData?.templates ?? [],
    [shiftTemplatesData?.templates],
  );
  const hrmDepartments = useMemo(
    () => hrmDepartmentsData?.departments ?? [],
    [hrmDepartmentsData?.departments],
  );
  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of hrmDepartments) map.set(d.id, d.name);
    return map;
  }, [hrmDepartments]);
  const defaultDepartmentId = hrmDepartments[0]?.id ?? null;
  const managerOptions = useMemo(() => {
    const rows = (managerPoolData?.users ?? []).filter((u) => u.status === "active");
    if (!editUser) return rows;
    return rows.filter((u) => u.id !== editUser.id);
  }, [managerPoolData?.users, editUser]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const selectedWithPresence = useMemo(() => {
    if (!selectedUser) return null;
    return mergeUserPresence(selectedUser, getPresence(selectedUser.id));
  }, [selectedUser, getPresence]);

  const presenceForUser = (user: User) =>
    parsePresenceStatus(getPresence(user.id)?.status ?? user.presenceStatus);

  const complianceNow = new Date();
  const [complianceMonth, setComplianceMonth] = useState(complianceNow.getMonth() + 1);
  const [complianceYear, setComplianceYear] = useState(complianceNow.getFullYear());
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  const [revealTimer, setRevealTimer] = useState<Record<number, NodeJS.Timeout>>({});

  const { data: credentials, isLoading: isLoadingCredentials } = useGetUserCredentials(selectedUser?.id || 0, {
    query: { enabled: !!selectedUser, queryKey: getGetUserCredentialsQueryKey(selectedUser?.id || 0) }
  });
  const { pageItems: credentialRows, pagination: credentialsPagination } = useClientPagination(
    credentials ?? [],
  );

  const revealMutation = useRevealCredential();

  const showLogCompliance =
    selectedUser &&
    isStaffEmployeeRole(selectedUser.role);

  const { data: employeeCompliance, isLoading: employeeComplianceLoading } =
    useGetLogComplianceCalendar(
      { month: complianceMonth, year: complianceYear, developerId: selectedUser?.id ?? 0 },
      {
        query: {
          enabled: Boolean(showLogCompliance && selectedUser?.id),
          queryKey: getGetLogComplianceCalendarQueryKey({
            month: complianceMonth,
            year: complianceYear,
            developerId: selectedUser?.id ?? 0,
          }),
        },
      },
    );

  useEffect(() => {
    if (!selectedUser?.id) return;
    const now = new Date();
    setComplianceMonth(now.getMonth() + 1);
    setComplianceYear(now.getFullYear());
  }, [selectedUser?.id]);

  const shiftComplianceMonth = (delta: number) => {
    const d = new Date(complianceYear, complianceMonth - 1 + delta, 1);
    setComplianceMonth(d.getMonth() + 1);
    setComplianceYear(d.getFullYear());
  };

  const complianceMonthLabel = new Date(complianceYear, complianceMonth - 1).toLocaleString(
    "default",
    { month: "long", year: "numeric" },
  );

  const handleReveal = async (credId: number) => {
    if (!selectedUser) return;
    if (revealedPasswords[credId]) {
      setRevealedPasswords(prev => {
        const next = { ...prev };
        delete next[credId];
        return next;
      });
      if (revealTimer[credId]) {
        clearTimeout(revealTimer[credId]);
      }
      return;
    }

    try {
      const res = await revealMutation.mutateAsync({ id: selectedUser.id, credId });
      setRevealedPasswords(prev => ({ ...prev, [credId]: res.password }));
      const timer = setTimeout(() => {
        setRevealedPasswords(prev => {
          const next = { ...prev };
          delete next[credId];
          return next;
        });
      }, 10000);
      setRevealTimer(prev => ({ ...prev, [credId]: timer }));
    } catch (err) {
      toast.error("Could not decrypt password history");
    }
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(teamEmployeeSchema),
    defaultValues: defaultTeamEmployeeFormValues(defaultDepartmentId),
    // Radix tabs unmount inactive panels — keep all tab fields in submit payload.
    shouldUnregister: false,
  });

  const employeeDialogOpen = isDialogOpen || !!editUser;
  const editUserId = editUser?.id;
  const {
    data: editUserProfile,
    isFetching: editProfileFetching,
    isError: editProfileError,
  } = useTeamEmployeeProfile(editUserId, employeeDialogOpen);

  const editProfileReady =
    !editUser || (editUserProfile != null && !editProfileFetching);

  const lastEditHydrateKeyRef = useRef<string | null>(null);
  const createFormInitializedRef = useRef(false);
  const editBaselineRef = useRef<TeamEmployeeFormValues | null>(null);

  useEffect(() => {
    if (!employeeDialogOpen) {
      lastEditHydrateKeyRef.current = null;
      createFormInitializedRef.current = false;
      editBaselineRef.current = null;
      return;
    }

    if (editUserId) {
      if (!editUserProfile || editProfileFetching) return;
      if (form.formState.isDirty) return;
      const hydrateKey = teamEmployeeEditHydrateKey(
        editUserProfile as User & Record<string, unknown>,
        defaultDepartmentId,
        hrmDepartments,
      );
      if (lastEditHydrateKeyRef.current === hydrateKey) return;
      lastEditHydrateKeyRef.current = hydrateKey;
      const mapped = mapUserToTeamEmployeeForm(
        editUserProfile as User & Record<string, unknown>,
        defaultDepartmentId,
        hrmDepartments,
        cmsRoleOptions,
        roleTemplateOptions,
      );
      editBaselineRef.current = {
        ...mapped,
        roleTemplateId: storedRoleTemplateId(editUserProfile as User & Record<string, unknown>),
      };
      form.reset(mapped);
      setPreviewEmployeeId(String(editUserProfile.employeeId ?? editUser?.employeeId ?? ""));
      return;
    }

    if (createFormInitializedRef.current) return;
    createFormInitializedRef.current = true;
    form.reset(defaultTeamEmployeeFormValues(defaultDepartmentId));
  }, [
    employeeDialogOpen,
    editUserId,
    editUserProfile,
    editProfileFetching,
    defaultDepartmentId,
    hrmDepartments,
    cmsRoleOptions,
    roleTemplateOptions,
    editUser?.employeeId,
    form,
    form.formState.isDirty,
  ]);

  useEffect(() => {
    if (!employeeDialogOpen || !editUserId || !editUserProfile || form.formState.isDirty) return;
    if (!cmsRoleOptions.length && !roleTemplateOptions.length) return;
    const resolved = mapUserToTeamEmployeeForm(
      editUserProfile as User & Record<string, unknown>,
      defaultDepartmentId,
      hrmDepartments,
      cmsRoleOptions,
      roleTemplateOptions,
    ).roleTemplateId;
    if (resolved == null) return;
    const current = form.getValues("roleTemplateId");
    if (current === resolved) return;
    form.setValue("roleTemplateId", resolved, { shouldDirty: false, shouldValidate: false });
  }, [
    employeeDialogOpen,
    editUserId,
    editUserProfile,
    cmsRoleOptions,
    roleTemplateOptions,
    defaultDepartmentId,
    hrmDepartments,
    form,
    form.formState.isDirty,
  ]);

  const syncDisplayNameFromParts = () => {
    const fn = form.getValues("firstName")?.trim() ?? "";
    const ln = form.getValues("lastName")?.trim() ?? "";
    const combined = `${fn} ${ln}`.trim();
    if (combined) {
      form.setValue("name", combined, { shouldValidate: false, shouldDirty: true });
    }
  };

  const watchedName = form.watch("name");

  useEffect(() => {
    if (editUser) {
      setPreviewEmployeeId(editUser.employeeId ?? "");
      return;
    }
    const name = watchedName?.trim();
    if (!name) {
      setPreviewEmployeeId("");
      return;
    }
    const token = getAccessToken();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/users/preview-employee-id?name=${encodeURIComponent(name)}`),
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (res.ok) {
          const body = (await res.json()) as { employeeId?: string };
          setPreviewEmployeeId(body.employeeId ?? "");
        }
      } catch {
        setPreviewEmployeeId("");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [watchedName, editUser]);

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (editUser) {
        const baseline = editBaselineRef.current;
        if (!baseline) {
          toast.error("Employee profile is still loading. Please try again.");
          return;
        }
        const result = await saveTeamEmployee.mutateAsync({
          id: editUser.id,
          values,
          departmentNameById,
          password: values.password?.trim() || undefined,
          baseline,
        });
        const trimmedPassword = values.password?.trim() ?? "";
        toast.success(trimmedPassword ? "Employee and password updated!" : "Employee updated!");
        setEditUser(null);
        setIsDialogOpen(false);
        setEmployeeFormTab("personal");
        void result;
      } else {
        const result = await saveTeamEmployee.mutateAsync({
          values,
          departmentNameById,
          password: values.password?.trim() || undefined,
        });
        toast.success(`Employee created! ID: ${result.employeeId ?? "assigned"}`);
        setIsDialogOpen(false);
        setEmployeeFormTab("personal");
        resetPage();
      }
      form.reset(defaultTeamEmployeeFormValues(defaultDepartmentId));
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["hrm", "employees"] });
    } catch {
      // Toast handled by useSaveTeamEmployee
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteUserMutation.mutateAsync({ id: deleteId });
      toast.success("Employee deactivated");
      setDeleteId(null);
      resetPage();
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (error: any) {
      toastApiError(error, "Failed to delete employee");
    }
  };

  const handleViewAs = async (employee: User, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canViewAsEmployee(employee)) return;
    if (isImpersonating) {
      toast.error("Exit the current view-as session first.");
      return;
    }
    setImpersonatingId(employee.id);
    try {
      await impersonate(employee.id);
      toast.success(`Viewing as ${employee.name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to view as employee";
      toast.error(message);
    } finally {
      setImpersonatingId(null);
    }
  };

  const columns: Column<User>[] = [
    {
      id: "name",
      header: "Employee",
      accessorKey: "name",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <AvatarWithPresence
            name={user.name}
            avatarUrl={user.avatarUrl}
            presenceStatus={presenceForUser(user)}
            avatarClassName="h-8 w-8"
          />
          <div>
            <p className="text-xs font-medium">{user.name}</p>
            <p className="text-[10px] text-muted-foreground flex items-center mt-0.5">
              <Mail className="h-2.5 w-2.5 mr-1" /> {user.email}
            </p>
          </div>
        </div>
      )
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: (user) => (
        <div className="flex flex-col gap-1">
          <Badge
            variant="secondary"
            className={`${employeeRoleBadgeClass(user.role)} w-fit text-[10px]`}
          >
            {employeeRoleLabel(user.role)}
          </Badge>
          <span className="text-[9px] text-muted-foreground">{user.designation || "General"}</span>
        </div>
      )
    },
    {
      id: "employeeId",
      header: "ID",
      accessorKey: "employeeId",
      cell: (user) => <span className="text-muted-foreground font-mono text-[10px]">{user.employeeId}</span>
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (user) => (
        <Badge variant="outline" className={`${user.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''} text-[10px]`}>
          {user.status}
        </Badge>
      )
    },
    {
      id: "presence",
      header: "Presence",
      cell: (user) => <EmployeePresenceCell user={user} />,
      detailCell: (user) => <EmployeePresenceDetailCell user={user} />,
    },
    {
      id: "lastSeen",
      header: "Last seen",
      cell: (user) => <EmployeeLastSeenCell user={user} />,
    },
    {
      id: "lastLoginAt",
      header: "Last login",
      accessorKey: "lastLoginAt",
      cell: (user) => <EmployeeLastLoginCell user={user} />,
    },
    {
      id: "department",
      header: "Department",
      detailOnly: true,
      accessorKey: "department",
    },
    {
      id: "phoneNumber",
      header: "Phone",
      detailOnly: true,
      detailCell: (user) => user.phoneNumber || "?",
    },
    {
      id: "joiningDate",
      header: "Joining date",
      detailOnly: true,
      detailCell: (user) =>
        user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : "?",
    },
    {
      id: "linkedin",
      header: "LinkedIn",
      detailOnly: true,
      detailCell: (user) =>
        user.linkedinUrl ? (
          <a href={user.linkedinUrl} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
            {user.linkedinUrl}
          </a>
        ) : (
          "?"
        ),
    },
    {
      id: "subType",
      header: "Sub-type",
      detailOnly: true,
      detailCell: (user) => user.subType || "?",
    },
    {
      id: "createdAt",
      header: "Joined system",
      detailOnly: true,
      detailCell: (user) => new Date(user.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      header: "Actions",
      hideInDetail: true,
      cell: (user) => (
        <div className="flex justify-end gap-2 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px] font-semibold"
            title="Open employee profile"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(getStaffProfileHref(user.id, user.role, viewer?.role));
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Profile
          </Button>
          {canViewAsEmployee(user) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              title="View as this employee"
              disabled={impersonatingId === user.id || isImpersonating}
              onClick={(e) => void handleViewAs(user, e)}
            >
              <LogIn className="h-3 w-3 mr-1" />
              View as
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEmployeeFormTab("personal"); setEditUser(user); }}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title={user.status !== "active" ? "Already deactivated" : "Deactivate employee"}
            disabled={user.status !== "active"}
            onClick={(e) => { e.stopPropagation(); setDeleteId(user.id); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Team"
        subtitle="Manage your agency's team members"
        actions={
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <PortalTabsList>
              <PortalTabsTrigger value="list">Team List</PortalTabsTrigger>
              <PortalTabsTrigger value="analytics">Analytics</PortalTabsTrigger>
            </PortalTabsList>
          </Tabs>
          <Dialog
            open={isDialogOpen || !!editUser}
            onOpenChange={(open) => {
              if (!open) {
                setIsDialogOpen(false);
                setEditUser(null);
                setPreviewEmployeeId("");
                setEmployeeFormTab("personal");
                form.reset(defaultTeamEmployeeFormValues(defaultDepartmentId));
              } else {
                setIsDialogOpen(true);
              }
            }}
          >
          <Button
            type="button"
            className={portalActionButtonClass("bg-primary text-primary-foreground")}
            onClick={() => {
              setEditUser(null);
              setPreviewEmployeeId("");
              setEmployeeFormTab("personal");
              form.reset(defaultTeamEmployeeFormValues(defaultDepartmentId));
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
          <DialogContent className="sm:max-w-[768px] max-h-[min(92dvh,880px)] p-0 gap-0 overflow-hidden flex flex-col bg-card border-border">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border/60 space-y-1">
              <DialogTitle className="text-lg">{editUser ? "Edit employee" : "Add employee"}</DialogTitle>
              <DialogDescription className="text-xs">
                {editUser
                  ? `Update ${editUser.name}'s profile across personal, work, pay, and document settings.`
                  : "Complete all four steps to onboard a new team member."}
              </DialogDescription>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground pt-1">
                Step {EMPLOYEE_FORM_TAB_META[employeeFormTab].step} of 4 · {EMPLOYEE_FORM_TAB_META[employeeFormTab].label}
              </p>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4 dialog-scroll">
                  {editUser && !editProfileReady ? (
                    <div className="space-y-4 py-8">
                      <PageTableSkeleton rows={6} columns={2} showToolbar={false} />
                      <p className="text-center text-sm text-muted-foreground">Loading employee profile…</p>
                    </div>
                  ) : editUser && editProfileError ? (
                    <p className="py-8 text-center text-sm text-destructive">
                      Could not load this employee&apos;s profile. Close and try again.
                    </p>
                  ) : (
                    <EmployeeFormTabs
                      form={form}
                      tab={employeeFormTab}
                      onTabChange={setEmployeeFormTab}
                      editUser={editUser}
                      previewEmployeeId={previewEmployeeId}
                      roleTemplateOptions={roleTemplateOptions}
                      cmsRoleOptions={cmsRoleOptions}
                      hrmDepartments={hrmDepartments}
                      managerOptions={managerOptions}
                      shiftTemplates={shiftTemplates}
                      onSyncDisplayName={syncDisplayNameFromParts}
                    />
                  )}
                </div>
                <DialogFooter className="shrink-0 px-6 py-4 border-t border-border/60 bg-muted/20 sm:justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditUser(null);
                        setPreviewEmployeeId("");
                        setEmployeeFormTab("personal");
                        form.reset(defaultTeamEmployeeFormValues(defaultDepartmentId));
                      }}
                    >
                      Cancel
                    </Button>
                    {prevEmployeeFormTab(employeeFormTab) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => setEmployeeFormTab(prevEmployeeFormTab(employeeFormTab)!)}
                      >
                        Back
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                    {nextEmployeeFormTab(employeeFormTab) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9"
                        onClick={() => setEmployeeFormTab(nextEmployeeFormTab(employeeFormTab)!)}
                      >
                        Continue
                      </Button>
                    ) : null}
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 min-w-[120px]"
                      disabled={
                        saveTeamEmployee.isPending ||
                        (editUser != null && (!editProfileReady || editProfileError))
                      }
                    >
                      {saveTeamEmployee.isPending
                        ? editUser
                          ? "Saving…"
                          : "Creating…"
                        : editUser
                          ? "Save changes"
                          : nextEmployeeFormTab(employeeFormTab)
                            ? "Save employee"
                            : "Create employee"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the employee account. They will no longer be able to log in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                {deleteUserMutation.isPending ? "Deactivating..." : "Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        }
      />

      <PortalKpiGrid
        loading={statsLoading}
        items={[
          { title: "Team members", value: teamStats.total, hint: "Developers & QA", icon: UsersIcon, accent: "violet" },
          { title: "Active", value: teamStats.active, hint: "Can sign in", icon: Zap, accent: "green" },
          { title: "Inactive", value: teamStats.inactive, hint: "Deactivated accounts", icon: Clock, accent: "amber", alert: teamStats.inactive > 0 },
          { title: "Avg utilization", value: `${teamStats.avgUtilization}%`, hint: "This month (logged hours)", icon: BarChart3, accent: "blue" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsContent value="list" className="space-y-4 m-0">
          <PortalContentCard>
              <div className="flex items-center gap-2 px-1 pb-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="inactive">Inactive only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isLoading ? (
                <PageTableSkeleton rows={8} columns={6} showToolbar />
              ) : (
                <AdvancedTable
                  data={data?.users || []}
                  columns={columns}
                  searchKey="name"
                  searchPlaceholder="Filter employees..."
                  filename="EmployeesExport"
                  viewStorageKey="employees"
                  onRowClick={(user) => setLocation(getStaffProfileHref(user.id, user.role, viewer?.role))}
                />
              )}
          </PortalContentCard>
          <DataPagination
            page={data?.page ?? page}
            total={data?.total ?? 0}
            limit={limit}
            loadedRowCount={data?.users?.length ?? 0}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <TeamAnalyticsPanel />
        </TabsContent>
      </Tabs>
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-[400px] sm:w-[580px] sm:max-w-[580px] overflow-y-auto">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-4">
              {selectedWithPresence ? (
                <AvatarWithPresence
                  name={selectedWithPresence.name}
                  avatarUrl={selectedWithPresence.avatarUrl}
                  presenceStatus={selectedWithPresence.presenceStatus}
                  avatarClassName="h-12 w-12 border-2 border-primary/10"
                />
              ) : null}
              <div>
                <SheetTitle className="text-base font-bold tracking-tight">{selectedUser?.name}</SheetTitle>
                <SheetDescription className="text-xs font-mono text-muted-foreground">{selectedUser?.employeeId || "No Employee ID"}</SheetDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] py-0.5 bg-primary/5 font-medium capitalize">{selectedUser?.role?.replace('_', ' ')}</Badge>
              <Badge variant="outline" className={`text-[10px] py-0.5 border-green-500/20 bg-green-500/10 text-green-600 font-medium capitalize ${selectedUser?.status !== 'active' ? 'opacity-50' : ''}`}>{selectedUser?.status}</Badge>
              {selectedUser && canViewAsEmployee(selectedUser) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-[10px] border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                  disabled={impersonatingId === selectedUser.id || isImpersonating}
                  onClick={() => void handleViewAs(selectedUser)}
                >
                  <LogIn className="mr-1.5 h-3 w-3" />
                  {impersonatingId === selectedUser.id ? "Opening?" : "View as employee"}
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList
              className={cn(
                "grid w-full h-8",
                showLogCompliance ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              <TabsTrigger value="overview" className="text-[10px] py-1">Overview</TabsTrigger>
              {showLogCompliance && (
                <TabsTrigger value="compliance" className="text-[10px] py-1 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Daily logs
                </TabsTrigger>
              )}
              <TabsTrigger value="credentials" className="text-[10px] py-1 flex items-center"><Key className="h-3 w-3 mr-1.5" /> Credential Vault</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 pt-3">
              {selectedWithPresence && (
                <UserPresenceMeta
                  presenceStatus={selectedWithPresence.presenceStatus}
                  lastSeenAt={selectedWithPresence.lastSeenAt}
                  lastLoginAt={selectedWithPresence.lastLoginAt}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Department</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Building className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> {(selectedUser as any)?.department || "Engineering"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Designation</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Award className="h-3.5 w-3.5 text-primary shrink-0" /> {selectedUser?.designation || "Developer"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {(selectedUser as any)?.phoneNumber || "Not shared"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Joined Date</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Calendar className="h-3.5 w-3.5 text-rose-500 shrink-0" /> {(selectedUser as any)?.joiningDate ? new Date((selectedUser as any).joiningDate).toLocaleDateString() : "Not recorded"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50 col-span-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground break-all"><Mail className="h-3.5 w-3.5 text-sky-500 shrink-0" /> {selectedUser?.email}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Specialty/Type</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Briefcase className="h-3.5 w-3.5 text-amber-500 shrink-0" /> {selectedUser?.subType || "Standard Fulltime"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Last Login</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Clock className="h-3.5 w-3.5 text-purple-500 shrink-0" /> {formatLastLogin(selectedWithPresence?.lastLoginAt)}</p>
                </div>
              </div>

              {(selectedUser as any)?.linkedinUrl && (
                <a 
                  href={(selectedUser as any).linkedinUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block group bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-all rounded-lg p-3 mt-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-md text-blue-600 group-hover:scale-105 transition-transform"><Linkedin className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-blue-600 transition-colors">LinkedIn Professional Profile</p>
                        <p className="text-[9px] text-muted-foreground">Click to view corporate synced career network</p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              )}
            </TabsContent>

            {showLogCompliance && (
              <TabsContent value="compliance" className="space-y-4 pt-3">
                <Card className="border-border/50 bg-muted/15 shadow-none">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Daily log compliance
                        </p>
                        <p className="text-sm font-semibold truncate">{complianceMonthLabel}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => shiftComplianceMonth(-1)}
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => shiftComplianceMonth(1)}
                          aria-label="Next month"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={complianceMonth.toString()}
                        onValueChange={(v) => setComplianceMonth(Number.parseInt(v, 10))}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2000, i).toLocaleString("default", { month: "long" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={complianceYear.toString()}
                        onValueChange={(v) => setComplianceYear(Number.parseInt(v, 10))}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => {
                            const y = new Date().getFullYear() - 2 + i;
                            return (
                              <SelectItem key={y} value={y.toString()}>
                                {y}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <LogComplianceCalendarPanel
                  data={employeeCompliance}
                  isLoading={employeeComplianceLoading}
                  variant="sheet"
                  compact
                />
              </TabsContent>
            )}
            
            <TabsContent value="credentials" className="pt-3">
              <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-3 py-2 border-b border-border/60 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-medium text-primary">Audit-Tracked Access History</p>
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent text-[9px] font-semibold text-muted-foreground">
                        <TableHead className="h-7 py-1 pl-3 text-center w-[50px]">Ver.</TableHead>
                        <TableHead className="h-7 py-1">Created By</TableHead>
                        <TableHead className="h-7 py-1">Date Set</TableHead>
                        <TableHead className="h-7 py-1 pr-3 text-right w-[120px]">Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingCredentials ? (
                        [...Array(3)].map((_, i) => (
                          <TableRow key={i}>
                            {[...Array(4)].map((_, j) => (
                              <TableCell key={j} className="py-2">
                                <Skeleton className="h-3.5 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : credentialRows.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-12 text-center text-[10px] text-muted-foreground">No historical logs recorded.</TableCell></TableRow>
                      ) : (
                        credentialRows.map((cred: any) => (
                          <TableRow key={cred.id} className="text-[10px] group/row hover:bg-muted/20 border-border/30">
                            <TableCell className="py-1 pl-3 text-center font-mono text-muted-foreground bg-muted/10 font-medium">#{cred.entryNumber}</TableCell>
                            <TableCell className="py-1 font-medium">{cred.setBy}</TableCell>
                            <TableCell className="py-1 text-muted-foreground">{new Date(cred.setAt).toLocaleDateString()}</TableCell>
                            <TableCell className="py-1 pr-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={`font-mono select-all px-1.5 py-0.5 rounded ${revealedPasswords[cred.id] ? 'text-primary bg-primary/10 font-semibold text-[10px]' : 'text-muted-foreground/60 tracking-widest text-[8px]'}`}>
                                  {revealedPasswords[cred.id] || '????????'}
                                </span>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 opacity-60 group-hover/row:opacity-100 hover:text-primary hover:bg-primary/10 transition-all"
                                  onClick={(e) => { e.stopPropagation(); handleReveal(cred.id); }}
                                  disabled={revealMutation.isPending}
                                >
                                  {revealedPasswords[cred.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <DataPagination {...credentialsPagination} />
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/80 mt-2 px-1 italic flex items-start gap-1">
                <span>??</span> Decrypted passwords remain visible for 10 seconds. Each decryption generates an immutable access trace log in the security backend.
              </p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </PortalPageShell>
  );
}
