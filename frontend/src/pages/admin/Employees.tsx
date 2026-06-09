import React, { useState, useEffect, useMemo } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
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
import { LogComplianceCalendarPanel } from "@/components/logs/LogComplianceCalendar";
import { TeamAnalyticsPanel } from "@/components/team/TeamAnalyticsPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { listQueryOptions } from "@/lib/list-query-options";
import { LIST_LIMIT, QUERY_STALE } from "@/lib/query-config";
import { LIST_COUNT_PARAMS, selectListTotal } from "@/hooks/use-list-totals";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@/api";
import { cn } from "@/lib/utils";

const employeeSchema = z
  .object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().or(z.literal("")),
  role: z.enum(["developer", "qa", "super_admin"]),
  status: z.enum(["active", "inactive"]).optional(),
  designation: z.string().optional(),
  subType: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  phoneNumber: z.string().optional(),
  joiningDate: z.string().optional(),
  linkedinUrl: z.string().optional(),
})
  .superRefine((data, ctx) => {
    const pwd = data.password?.trim() ?? "";
    if (pwd.length > 0 && pwd.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["password"],
      });
    }
  });

type EmployeeFormValues = z.infer<typeof employeeSchema>;

function canViewAsEmployee(user: User): boolean {
  return (
    user.status === "active" &&
    (user.role === "developer" || user.role === "tester" || user.role === "qa")
  );
}

function employeeRoleLabel(role: string): string {
  if (role === "super_admin") return "Admin";
  if (role === "qa") return "QA";
  if (role === "tester") return "Tester";
  return "Developer";
}

function employeeRoleBadgeClass(role: string): string {
  if (role === "super_admin") return "bg-purple-500/10 text-purple-500";
  if (role === "qa") return "bg-amber-500/10 text-amber-700";
  if (role === "tester") return "bg-cyan-500/10 text-cyan-700";
  return "bg-blue-500/10 text-blue-500";
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
  const { impersonate, isImpersonating } = useAuth();
  const { getPresence } = usePresence();
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const [previewEmployeeId, setPreviewEmployeeId] = useState("");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => {
    resetPage();
  }, [search, resetPage]);

  const { data, isLoading } = useListUsers(
    { staff: "1", search, page, limit: apiLimit },
    {
      query: listQueryOptions({
        queryKey: getListUsersQueryKey({ staff: "1", search, page, limit: apiLimit }),
      }),
    },
  );

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
      (u) => u.role === "developer" || u.role === "tester" || u.role === "qa",
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
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

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
    (selectedUser.role === "developer" || selectedUser.role === "tester" || selectedUser.role === "qa");

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
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "developer",
      status: "active",
      designation: "",
      subType: "",
      department: "Engineering",
      phoneNumber: "",
      joiningDate: new Date().toISOString().split("T")[0],
      linkedinUrl: "",
    },
  });

  useEffect(() => {
    if (editUser) {
      form.reset({
        name: editUser.name,
        email: editUser.email,
        password: "",
        role: editUser.role as any,
        status: editUser.status as any,
        designation: editUser.designation || "",
        subType: editUser.subType || "",
        department: (editUser as any).department || "Engineering",
        phoneNumber: (editUser as any).phoneNumber || "",
        joiningDate: (editUser as any).joiningDate ? new Date((editUser as any).joiningDate).toISOString().split("T")[0] : "",
        linkedinUrl: (editUser as any).linkedinUrl || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        password: "",
        role: "developer",
        status: "active",
        designation: "",
        subType: "",
        department: "Engineering",
        phoneNumber: "",
        joiningDate: new Date().toISOString().split("T")[0],
        linkedinUrl: "",
      });
    }
  }, [editUser, form]);

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
        const { password, ...updateData } = values;
        const trimmedPassword = password?.trim() ?? "";
        await updateUserMutation.mutateAsync({
          id: editUser.id,
          data: trimmedPassword
            ? ({ ...updateData, password: trimmedPassword } as any)
            : (updateData as any),
        });
        toast.success(trimmedPassword ? "Employee and password updated!" : "Employee updated!");
        setEditUser(null);
        setIsDialogOpen(false);
      } else {
        if (!values.password?.trim()) {
          form.setError("password", { message: "Login password is required for new employees" });
          return;
        }
        const result = await createUserMutation.mutateAsync({
          data: { ...values, password: values.password.trim() } as any,
        });
        toast.success(`Employee created! ID: ${result.employeeId}`);
        setIsDialogOpen(false);
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (error: any) {
      toastApiError(error, "Failed to save employee");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteUserMutation.mutateAsync({ id: deleteId });
      toast.success("Employee deactivated");
      setDeleteId(null);
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
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedUser(user)}>
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
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditUser(user); }}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteId(user.id); }}>
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
              form.reset({
                name: "",
                email: "",
                password: "",
                role: "developer",
                status: "active",
                designation: "",
                subType: "",
                department: "Engineering",
                phoneNumber: "",
                joiningDate: new Date().toISOString().split("T")[0],
                linkedinUrl: "",
              });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
          <DialogContent className="sm:max-w-[520px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editUser ? "Edit Employee" : "Add Employee"}</DialogTitle>
              <DialogDescription>
                {editUser ? "Update team member details." : "Create a new team member account."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Employee ID</Label>
                  <Input
                    readOnly
                    value={
                      editUser
                        ? editUser.employeeId ?? "-"
                        : previewEmployeeId || "Enter name to preview ID"
                    }
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {editUser
                      ? "Assigned employee identifier"
                      : "Auto-generated when you save (preview updates as you type)"}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editUser ? "New login password (optional)" : "Login password"}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Min. 8 characters"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground">
                        {editUser
                          ? "Leave blank to keep the current password"
                          : "Set the password the employee will use to sign in"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="qa">QA</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editUser && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input placeholder="Senior Developer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team/Specialty</FormLabel>
                        <FormControl>
                          <Input placeholder="Mobile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="QA">QA</SelectItem>
                            <SelectItem value="Product">Product</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="joiningDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Joining Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 555-0100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn Profile</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                    {(createUserMutation.isPending || updateUserMutation.isPending) ? (editUser ? "Saving..." : "Creating...") : (editUser ? "Update Employee" : "Create Employee")}
                  </Button>
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
