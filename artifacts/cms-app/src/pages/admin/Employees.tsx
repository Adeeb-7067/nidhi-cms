import React, { useState, useEffect } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey, useGetTeamAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { Search, Plus, Mail, Clock, Trash2, Edit, BarChart3, Users as UsersIcon, Award, PieChart as PieChartIcon, Zap } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@workspace/api-client-react";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum(["developer", "super_admin"]),
  status: z.enum(["active", "inactive"]).optional(),
  designation: z.string().optional(),
  subType: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function AdminEmployees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search]);

  const PAGE_SIZE = 10;
  const { data, isLoading } = useListUsers({ role: "developer", search, page, limit: PAGE_SIZE });
  const { data: teamAnalytics, isLoading: isLoadingAnalytics } = useGetTeamAnalytics();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

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
      });
    }
  }, [editUser, form]);

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (editUser) {
        const { password, ...updateData } = values;
        await updateUserMutation.mutateAsync({ 
          id: editUser.id, 
          data: password ? values : updateData as any 
        });
        toast.success("Employee updated!");
        setEditUser(null);
      } else {
        if (!values.password) {
          toast.error("Password is required for new employees");
          return;
        }
        const result = await createUserMutation.mutateAsync({ data: values as any });
        toast.success(`Employee created! ID: ${result.employeeId}`);
        setIsDialogOpen(false);
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save employee");
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
      toast.error(error?.response?.data?.message || error?.message || "Failed to delete employee");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage your agency's team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="list" className="rounded-md px-3 h-8 text-xs">Team List</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-md px-3 h-8 text-xs">Analytics</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isDialogOpen || !!editUser} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditUser(null);
            } else {
              setIsDialogOpen(true);
            }
          }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
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
                      <FormLabel>{editUser ? "New Password (Optional)" : "Password"}</FormLabel>
                      <FormControl>
                        <Input placeholder="********" type="password" {...field} />
                      </FormControl>
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
    </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsContent value="list" className="space-y-4 m-0">
          <Card className="bg-card">
            {data && (
              <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/20">
                <div className="text-center">
                  <div className="text-xl font-bold">{data.total}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-xl font-bold text-green-500">{data.users.filter(u => u.status === 'active').length}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-500">{data.users.filter(u => u.role === 'developer').length}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Developers</div>
                </div>
              </div>
            )}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search employees..." 
                  className="pl-8 h-7 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Employee</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">ID</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Last Login</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : data?.users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.users.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-muted/40 group">
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{user.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                                <Mail className="h-2.5 w-2.5 mr-1" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-1">
                            <Badge 
                              variant="secondary" 
                              className={`${user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500 w-fit' : 'bg-blue-500/10 text-blue-500 w-fit'} text-[10px]`}
                            >
                              {user.role === 'super_admin' ? 'Admin' : 'Developer'}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">{user.designation || "General"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[10px]">{user.employeeId}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={`${user.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''} text-[10px]`}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.lastLoginAt ? (
                            <div className="flex items-center">
                              <Clock className="mr-1.5 h-3 w-3" />
                              {new Date(user.lastLoginAt).toLocaleDateString()}
                            </div>
                          ) : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditUser(user); }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteId(user.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <DataPagination
            page={page}
            total={data?.total ?? 0}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 m-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">Top Performer</CardTitle>
                <Award className="h-3.5 w-3.5 text-yellow-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">
                  {teamAnalytics?.developers?.[0]?.name || "N/A"}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Most active developer
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">Avg Completion</CardTitle>
                <Zap className="h-3.5 w-3.5 text-blue-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">
                  {teamAnalytics?.developers?.length ? 
                    Math.round(teamAnalytics.developers.reduce((acc, d) => acc + (d.utilisationPct || 0), 0) / teamAnalytics.developers.length) : 0}%
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Team project health
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">Active Team</CardTitle>
                <UsersIcon className="h-3.5 w-3.5 text-purple-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{data?.total || 0}</div>
                <p className="text-[10px] text-muted-foreground">
                  Total developers
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">Total Workload</CardTitle>
                <BarChart3 className="h-3.5 w-3.5 text-green-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">
                  {teamAnalytics?.developers?.reduce((acc, d) => acc + (d.activeProjects || 0), 0) || 0}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Active project assignments
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Bugs Resolved per Developer</CardTitle>
                <CardDescription className="text-xs">Performance in bug tracking</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamAnalytics?.developers || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                      <Bar dataKey="bugsResolvedCount" name="Bugs Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Hours Logged this Month</CardTitle>
                <CardDescription className="text-xs">Time tracking per developer</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamAnalytics?.developers || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                      <Bar dataKey="hoursLogged" name="Hours Logged" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Project Assignments</CardTitle>
                <CardDescription className="text-xs">Number of active projects per developer</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={teamAnalytics?.developers || []}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                      <Bar dataKey="activeProjects" name="Active Projects" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Team Performance (Avg Completion %)</CardTitle>
                <CardDescription className="text-xs">Individual progress across assigned projects</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamAnalytics?.developers || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                      <Bar dataKey="utilisationPct" name="Utilisation %" radius={[4, 4, 0, 0]}>
                        {(teamAnalytics?.developers || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
