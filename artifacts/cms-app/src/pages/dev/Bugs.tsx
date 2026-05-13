import React, { useState } from "react";
import { useListBugs, useCreateBug, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Bug as BugIcon, Search, Filter, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const bugSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  platform: z.enum(["android", "ios", "web", "api", "all"]),
  description: z.string().optional(),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  buildVersion: z.string().optional(),
});

type BugFormValues = z.infer<typeof bugSchema>;

export default function DevBugs() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading, refetch } = useListBugs({ 
    status: statusFilter !== "all" ? statusFilter as any : undefined, 
    limit: 50 
  });
  const { data: projectsData } = useListProjects({ limit: 50 });
  const createBug = useCreateBug();

  const form = useForm<BugFormValues>({
    resolver: zodResolver(bugSchema),
    defaultValues: {
      projectId: "",
      title: "",
      severity: "medium",
      priority: "p3",
      platform: "all",
      description: "",
      stepsToReproduce: "",
      expectedBehavior: "",
      actualBehavior: "",
      buildVersion: "",
    },
  });

  const onSubmit = async (values: BugFormValues) => {
    try {
      await createBug.mutateAsync({
        data: {
          ...values,
          projectId: parseInt(values.projectId),
        },
      });
      toast.success("Bug reported!");
      setOpen(false);
      form.reset();
      refetch();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Action failed. Please try again.";
      toast.error(msg);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'text-red-500 border-red-500/50 bg-red-500/10';
      case 'in_progress': return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
      case 'fixed': return 'text-purple-500 border-purple-500/50 bg-purple-500/10';
      case 'verified': return 'text-green-500 border-green-500/50 bg-green-500/10';
      case 'wont_fix': case 'duplicate': return 'text-gray-500 border-gray-500/50 bg-gray-500/10';
      default: return '';
    }
  };

  const filteredBugs = data?.bugs.filter(bug => 
    bug.title.toLowerCase().includes(search.toLowerCase()) || 
    bug.bugNumber.toLowerCase().includes(search.toLowerCase()) ||
    bug.projectName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bug Tracker</h1>
          <p className="text-muted-foreground">Report and track project issues</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Report Bug
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-card border-border overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Report a New Bug</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectsData?.projects.map((project) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bug Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Short descriptive title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="p1">P1 (Immediate)</SelectItem>
                            <SelectItem value="p2">P2 (High)</SelectItem>
                            <SelectItem value="p3">P3 (Normal)</SelectItem>
                            <SelectItem value="p4">P4 (Low)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="android">Android</SelectItem>
                            <SelectItem value="ios">iOS</SelectItem>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buildVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Build Version (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1.0.4 (42)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Overall description of the issue..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stepsToReproduce"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Steps to Reproduce (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="1. Open app\n2. Click..." className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="expectedBehavior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Behavior (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What should happen?" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actualBehavior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Behavior (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What actually happens?" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createBug.isPending}>
                    {createBug.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Report Bug
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
            <TabsTrigger value="open" className="rounded-md">Open</TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-md">In Progress</TabsTrigger>
            <TabsTrigger value="fixed" className="rounded-md">Fixed</TabsTrigger>
            <TabsTrigger value="verified" className="rounded-md">Verified</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search bugs..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredBugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <BugIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No bugs found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBugs.map((bug) => (
                  <TableRow key={bug.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{bug.bugNumber}</TableCell>
                    <TableCell className="font-medium">{bug.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{bug.projectName}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", getSeverityColor(bug.severity))}>
                        {bug.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(bug.status)}>
                        {bug.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {bug.assigneeName || <span className="text-muted-foreground italic">Unassigned</span>}
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
