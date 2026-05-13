import React, { useState } from "react";
import { useListProjects, useListClients, useCreateProject } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Calendar, Clock, LayoutGrid, List as ListIcon, Briefcase, Users } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  startDate: z.string().min(1, "Start date is required"),
  deadline: z.string().min(1, "Deadline is required"),
  description: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  figmaUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  repoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
}).refine(data => !data.deadline || !data.startDate || new Date(data.deadline) >= new Date(data.startDate), {
  message: "Deadline must be after start date",
  path: ["deadline"]
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const TECH_OPTIONS = [
  "React Native", "Flutter", "iOS Native", "Android Native", 
  "React", "Next.js", "Vue", "Angular", 
  "Node.js", "Django", "Laravel", 
  "PostgreSQL", "MongoDB", "Firebase", 
  "AWS", "Docker"
];

export default function AdminProjects() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, isLoading, refetch } = useListProjects({ search, limit: 50 });
  const { data: clientsData } = useListClients({ limit: 100 });
  const createProject = useCreateProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      clientId: "",
      priority: "medium",
      startDate: new Date().toISOString().split('T')[0],
      deadline: "",
      description: "",
      techStack: [],
      figmaUrl: "",
      repoUrl: "",
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await createProject.mutateAsync({ 
        data: {
          ...values,
          clientId: parseInt(values.clientId),
          techStack: values.techStack || []
        } 
      });
      toast.success("Project created");
      setIsDialogOpen(false);
      form.reset();
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to create project");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'in_progress': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'on_hold': return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
      case 'scoping': return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      case 'uat': return 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  function getDeadlineStatus(deadline: string) {
    const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Overdue", color: "border-red-500", bg: "bg-red-500/5", text: "text-red-500" };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: "border-red-400", bg: "bg-red-500/5", text: "text-red-400" };
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: "border-amber-400", bg: "bg-amber-500/5", text: "text-amber-400" };
    return { label: `${daysLeft}d left`, color: "border-green-500", bg: "", text: "text-green-500" };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all client projects</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
              <DialogDescription>
                Create a new project for a client.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Mobile App Redesign" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientsData?.clients.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.companyName}
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
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
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
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadline</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief project overview..." 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="techStack"
                    render={() => (
                      <FormItem>
                        <FormLabel>Tech Stack</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border rounded-md p-3">
                          {TECH_OPTIONS.map((tech) => (
                            <FormField
                              key={tech}
                              control={form.control}
                              name="techStack"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={tech}
                                    className="flex flex-row items-start space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(tech)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), tech])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== tech
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-xs font-normal cursor-pointer">
                                      {tech}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="figmaUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Figma URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://figma.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="repoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repository URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createProject.isPending}>
                      {createProject.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search projects..." 
            className="pl-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center border border-border rounded-md bg-card p-0.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 px-2 ${view === 'grid' ? 'bg-muted' : ''}`}
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 px-2 ${view === 'list' ? 'bg-muted' : ''}`}
            onClick={() => setView('list')}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : data?.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg bg-card/50">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {search ? "No projects match your search query." : "You don't have any projects yet. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {data?.projects.map((project) => {
            const deadlineStatus = getDeadlineStatus(project.deadline);
            return (
              <Link key={project.id} href={`/admin/projects/${project.id}`}>
                <Card className={`bg-card hover:bg-muted/40 transition-colors cursor-pointer border-border h-full flex flex-col border-t-2 ${deadlineStatus.color} card-hover`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {project.techStack && project.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.techStack.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{t}</span>
                          ))}
                          {project.techStack.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">+{project.techStack.length - 3}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center text-xs font-medium">
                        <span className={`h-2 w-2 rounded-full mr-1.5 bg-current ${getPriorityColor(project.priority)}`}></span>
                        <span className={getPriorityColor(project.priority)}>
                          {project.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-xl line-clamp-1">{project.name}</CardTitle>
                    <div className="text-sm text-muted-foreground line-clamp-1">{project.clientName}</div>
                  </CardHeader>
                  <CardContent className="pb-2 flex-1">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          Deadline
                        </div>
                        <div className={`font-medium flex items-center gap-2 ${deadlineStatus.text}`}>
                          {deadlineStatus.label}
                          <span className="text-muted-foreground text-xs">({new Date(project.deadline).toLocaleDateString()})</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{project.completionPct}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 ease-in-out" 
                            style={{ width: `${project.completionPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <div className="mt-4 px-5 pb-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-semibold text-foreground">{project.completionPct ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full progress-fill"
                        style={{
                          width: `${project.completionPct ?? 0}%`,
                          background: (project.completionPct ?? 0) >= 80 ? '#22c55e' : (project.completionPct ?? 0) >= 40 ? 'hsl(var(--primary))' : '#f59e0b'
                        }}
                      />
                    </div>
                  </div>
                  <CardFooter className="pt-2 border-t border-border mt-auto">
                    <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                      <div className="flex -space-x-2">
                        {/* Avatar stack mockup */}
                        {[...Array(Math.min(project.memberCount, 3))].map((_, i) => (
                          <div key={i} className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">
                            <Users className="h-3 w-3" />
                          </div>
                        ))}
                        {project.memberCount > 3 && (
                          <div className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-medium text-secondary-foreground">
                            +{project.memberCount - 3}
                          </div>
                        )}
                        {project.memberCount === 0 && <span>No team assigned</span>}
                      </div>
                      <div className="flex gap-2">
                        {project.techStack.slice(0, 2).map(tech => (
                          <Badge key={tech} variant="outline" className="text-[10px] py-0 h-4">{tech}</Badge>
                        ))}
                        {project.techStack.length > 2 && <span className="text-[10px]">+{project.techStack.length - 2}</span>}
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
