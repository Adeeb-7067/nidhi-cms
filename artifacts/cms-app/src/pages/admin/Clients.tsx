import React, { useState, useEffect } from "react";
import { useListClients, useCreateClient, useUpdateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { Search, Plus, Mail, Building, Briefcase, Trash2, Edit } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "@workspace/api-client-react";

const clientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  businessId: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function AdminClients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search]);

  const PAGE_SIZE = 10;
  const { data, isLoading } = useListClients({ search, page, limit: PAGE_SIZE });
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      businessId: "",
      industry: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (editClient) {
      form.reset({
        companyName: editClient.companyName,
        contactPerson: editClient.contactPerson,
        email: editClient.email,
        phone: editClient.phone || "",
        businessId: editClient.businessId || "",
        industry: editClient.industry || "",
        status: editClient.status as any,
      });
    } else {
      form.reset({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        businessId: "",
        industry: "",
        status: "active",
      });
    }
  }, [editClient, form]);

  const onSubmit = async (values: ClientFormValues) => {
    try {
      if (editClient) {
        await updateClientMutation.mutateAsync({ id: editClient.id, data: values as any });
        toast.success("Client updated successfully");
        setEditClient(null);
      } else {
        await createClientMutation.mutateAsync({ data: values as any });
        toast.success("Client added successfully");
        setIsDialogOpen(false);
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save client");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClientMutation.mutateAsync({ id: deleteId });
      toast.success("Client deleted successfully");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to delete client");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage your client relationships</p>
        </div>
        <Dialog open={isDialogOpen || !!editClient} onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setEditClient(null);
          } else {
            setIsDialogOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editClient ? "Edit Client" : "Add Client"}</DialogTitle>
              <DialogDescription>
                {editClient ? "Update client company details." : "Register a new client company."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
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
                        <Input placeholder="john@acme.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business ID</FormLabel>
                        <FormControl>
                          <Input placeholder="TAX-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="Technology" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {editClient && (
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
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createClientMutation.isPending || updateClientMutation.isPending}>
                    {(createClientMutation.isPending || updateClientMutation.isPending) ? (editClient ? "Updating..." : "Adding...") : (editClient ? "Update Client" : "Add Client")}
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
                This will permanently delete the client company and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
              <div className="text-xl font-bold text-green-500">{data.clients.filter(c => c.status === 'active').length}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-xl font-bold text-blue-500">{data.clients.reduce((acc, c) => acc + (c.activeProjectCount || 0), 0)}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Active Projects</div>
            </div>
          </div>
        )}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search clients..." 
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
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Company</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Contact Person</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Active Projects</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Client Since</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.clients.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50 card-hover text-xs">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-md">
                          <AvatarImage src={client.logoUrl || undefined} />
                          <AvatarFallback className="bg-secondary/20 text-secondary rounded-md text-[10px]">
                            <Building className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{client.companyName}</p>
                          <p className="text-[10px] text-muted-foreground">{client.businessId || 'No ID'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{client.contactPerson}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                          <Mail className="h-2.5 w-2.5 mr-1" /> {client.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs">
                        <Briefcase className="mr-2 h-3 w-3 text-muted-foreground" />
                        {client.activeProjectCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(client.clientSince).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditClient(client); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }}>
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
    </div>
  );
}
