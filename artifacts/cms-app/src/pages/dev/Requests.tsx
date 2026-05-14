import React, { useState } from "react";
import { useListRequests, useCreateRequest, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Inbox, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const requestSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  type: z.enum(["software_license", "hardware", "api_access", "server_hosting", "design_asset", "other"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  urgency: z.enum(["low", "medium", "high"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function DevRequests() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useListRequests({ limit: 50 });
  const { data: projectsData } = useListProjects({ limit: 50 });
  const createRequest = useCreateRequest();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      projectId: "",
      type: "software_license",
      title: "",
      description: "",
      urgency: "medium",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    try {
      await createRequest.mutateAsync({
        data: {
          ...values,
          projectId: parseInt(values.projectId),
        },
      });
      toast.success("Request submitted");
      setOpen(false);
      form.reset();
      refetch();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Action failed. Please try again.";
      toast.error(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-blue-500 border-blue-500/50 bg-blue-500/10 text-[10px]">PENDING</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-[10px]">APPROVED</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10 text-[10px]">REJECTED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status.toUpperCase()}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10 text-[10px]">HIGH</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 text-[10px]">MEDIUM</Badge>;
      case "low":
        return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-[10px]">LOW</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{urgency.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Resource Requests</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Request tools, hardware, or access</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Resource Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="software_license">Software License</SelectItem>
                            <SelectItem value="hardware">Hardware</SelectItem>
                            <SelectItem value="api_access">API Access</SelectItem>
                            <SelectItem value="server_hosting">Server Hosting</SelectItem>
                            <SelectItem value="design_asset">Design Asset</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Adobe XD License" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why you need this resource..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createRequest.isPending}>
                    {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Urgency</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center">
                      <Inbox className="h-8 w-8 mb-2 opacity-50" />
                      <p>No resource requests found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.requests.map((request) => (
                  <TableRow key={request.id} className="text-xs">
                    <TableCell className="capitalize">{request.type.replace('_', ' ')}</TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell className="text-muted-foreground">{request.projectName}</TableCell>
                    <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
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
