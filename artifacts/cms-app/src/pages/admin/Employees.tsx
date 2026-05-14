import React, { useState } from "react";
import { useListUsers, useCreateUser } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Mail, Clock } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["developer", "super_admin"]),
  designation: z.string().optional(),
  subType: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function AdminEmployees() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, isLoading, refetch } = useListUsers({ role: "developer", search, limit: 50 });
  const createUser = useCreateUser();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "developer",
      designation: "",
      subType: "",
    },
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      const result = await createUser.mutateAsync({ data: values });
      toast.success(`Employee created! ID: ${result.employeeId}`);
      setIsDialogOpen(false);
      form.reset();
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to create employee");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage your agency's team members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Create a new team member account.
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="********" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating..." : "Create Employee"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 text-xs">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
