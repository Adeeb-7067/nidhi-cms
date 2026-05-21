import React, { useState, useEffect, useMemo } from "react";
import { useListClients, useCreateClient, useUpdateClient, getListClientsQueryKey, useGetUserCredentials, useRevealCredential, getGetUserCredentialsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { AdvancedTable, Column } from "@/components/ui/advanced-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Mail, Building, Briefcase, Trash2, Edit, Eye, EyeOff, Key, ShieldCheck, Phone, Calendar, Award, Globe, ExternalLink, Users, TrendingUp, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
import { toastApiError, getApiErrorMessage } from "@/lib/api-error";
import { listQueryOptions } from "@/lib/list-query-options";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "@workspace/api-client-react";

const clientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Invalid company email"),
  portalEmail: z.string().email("Invalid portal login email").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  tier: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

function canViewAsClient(client: Client): boolean {
  return client.status === "active" && client.userId != null && client.userId > 0;
}

export default function AdminClients() {
  const { impersonate, isImpersonating } = useAuth();
  const [impersonatingUserId, setImpersonatingUserId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search]);

  const PAGE_SIZE = 10;
  const { data, isLoading } = useListClients(
    { search, page, limit: PAGE_SIZE },
    { query: listQueryOptions({ queryKey: getListClientsQueryKey({ search, page, limit: PAGE_SIZE }) }) },
  );
  const { data: statsData, isLoading: statsLoading } = useListClients(
    { limit: 500 },
    { query: listQueryOptions({ queryKey: getListClientsQueryKey({ limit: 500 }), staleTime: 120_000 }) },
  );

  const clientStats = useMemo(() => {
    const clients = statsData?.clients ?? [];
    return {
      total: statsData?.total ?? clients.length,
      active: clients.filter((c) => c.status === "active").length,
      inactive: clients.filter((c) => c.status !== "active").length,
      activeProjects: clients.reduce((acc, c) => acc + (c.activeProjectCount || 0), 0),
    };
  }, [statsData]);
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = { mutateAsync: async (_: { id: number }) => {}, isPending: false }; // Mock: useDeleteClient does not exist in generated spec

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  const [revealTimer, setRevealTimer] = useState<Record<number, NodeJS.Timeout>>({});

  const { data: credentials, isLoading: isLoadingCredentials } = useGetUserCredentials(selectedClient?.userId || 0, {
    query: { enabled: !!selectedClient?.userId, queryKey: getGetUserCredentialsQueryKey(selectedClient?.userId || 0) }
  });

  const revealMutation = useRevealCredential();

  const handleReveal = async (credId: number) => {
    if (!selectedClient?.userId) return;
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
      const res = await revealMutation.mutateAsync({ id: selectedClient.userId, credId });
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

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      portalEmail: "",
      password: "",
      phone: "",
      gstNumber: "",
      industry: "",
      website: "",
      tier: "Standard",
      status: "active",
    },
  });

  useEffect(() => {
    if (editClient) {
      form.reset({
        companyName: editClient.companyName,
        contactPerson: editClient.contactPerson,
        email: editClient.email,
        portalEmail: "",
        password: "",
        phone: editClient.phone || "",
        gstNumber: editClient.gstNumber || "",
        industry: (editClient as any).industry || "",
        website: (editClient as any).website || "",
        tier: (editClient as any).tier || "Standard",
        status: editClient.status as any,
      });
    } else {
      form.reset({
        companyName: "",
        contactPerson: "",
        email: "",
        portalEmail: "",
        password: "",
        phone: "",
        gstNumber: "",
        industry: "",
        website: "",
        tier: "Standard",
        status: "active",
      });
    }
  }, [editClient, form]);

  const onSubmit = async (values: ClientFormValues) => {
    try {
      if (editClient) {
        const { portalEmail, password, ...rest } = values;
        const payload: Record<string, unknown> = { ...rest };
        if (portalEmail?.trim()) payload.portalEmail = portalEmail.trim();
        if (password?.trim()) payload.password = password;
        await updateClientMutation.mutateAsync({ id: editClient.id, data: payload as any });
        toast.success("Client updated successfully");
        setEditClient(null);
      } else {
        if (!values.password?.trim()) {
          toast.error("Portal password is required");
          return;
        }
        const portalEmail = values.portalEmail?.trim() || values.email;
        await createClientMutation.mutateAsync({
          data: { ...values, portalEmail, password: values.password } as any,
        });
        toast.success("Company and portal login created");
        setIsDialogOpen(false);
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    } catch (error: any) {
      toastApiError(error, "Failed to save client");
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
      toastApiError(error, "Failed to delete client");
    }
  };

  const handleViewAsClient = async (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canViewAsClient(client) || !client.userId) return;
    if (isImpersonating) {
      toast.error("Exit the current view-as session first.");
      return;
    }
    setImpersonatingUserId(client.userId);
    try {
      await impersonate(client.userId);
      toast.success(`Viewing client portal as ${client.companyName}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to view as client";
      toast.error(message);
    } finally {
      setImpersonatingUserId(null);
    }
  };

  const columns: Column<Client>[] = [
    {
      id: "companyName",
      header: "Company",
      accessorKey: "companyName",
      cell: (client) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedClient(client)}>
          <Avatar className="h-8 w-8 rounded-md">
            <AvatarImage src={client.logoUrl || undefined} />
            <AvatarFallback className="bg-secondary/20 text-secondary rounded-md text-[10px]">
              <Building className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{client.companyName}</p>
            <p className="text-[10px] text-muted-foreground">{client.gstNumber || "No GST"}</p>
          </div>
        </div>
      )
    },
    {
      id: "contactPerson",
      header: "Contact Person",
      accessorKey: "contactPerson",
      cell: (client) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{client.contactPerson}</span>
          <span className="text-[10px] text-muted-foreground flex items-center mt-0.5">
            <Mail className="h-2.5 w-2.5 mr-1" /> {client.email}
          </span>
        </div>
      )
    },
    {
      id: "activeProjects",
      header: "Active Projects",
      accessorKey: "activeProjectCount",
      cell: (client) => (
        <div className="flex items-center text-xs">
          <Briefcase className="mr-2 h-3 w-3 text-muted-foreground" />
          {client.activeProjectCount}
        </div>
      )
    },
    {
      id: "clientSince",
      header: "Client Since",
      accessorKey: "clientSince",
      cell: (client) => (
        <span className="text-xs text-muted-foreground">
          {new Date(client.clientSince).toLocaleDateString()}
        </span>
      )
    },
    {
      id: "phone",
      header: "Phone",
      detailOnly: true,
      detailCell: (client) => client.phone || "â€”",
    },
    {
      id: "address",
      header: "Address",
      detailOnly: true,
      detailCell: (client) => (
        <span className="whitespace-pre-wrap">{client.address || "â€”"}</span>
      ),
    },
    {
      id: "industry",
      header: "Industry",
      detailOnly: true,
      accessorKey: "industry",
    },
    {
      id: "website",
      header: "Website",
      detailOnly: true,
      detailCell: (client) =>
        client.website ? (
          <a href={client.website} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
            {client.website}
          </a>
        ) : (
          "â€”"
        ),
    },
    {
      id: "tier",
      header: "Tier",
      detailOnly: true,
      accessorKey: "tier",
    },
    {
      id: "status",
      header: "Status",
      detailOnly: true,
      cell: (client) => (
        <Badge variant="outline" className="text-[10px] capitalize">{client.status}</Badge>
      ),
    },
    {
      id: "portalLogin",
      header: "Portal access",
      detailOnly: true,
      detailCell: (client) => (client.portalLogin ? "Enabled" : "Disabled"),
    },
    {
      id: "actions",
      header: "Actions",
      hideInDetail: true,
      cell: (client) => (
        <div className="flex justify-end gap-2 transition-opacity">
          {canViewAsClient(client) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              title="View as this client"
              disabled={impersonatingUserId === client.userId || isImpersonating}
              onClick={(e) => void handleViewAsClient(client, e)}
            >
              <LogIn className="h-3 w-3 mr-1" />
              View as
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditClient(client); }}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage your client relationships</p>
        </div>
        <Dialog
          open={isDialogOpen || !!editClient}
          onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditClient(null);
            } else {
              setIsDialogOpen(true);
            }
          }}
        >
          <Button
            type="button"
            className="bg-primary text-primary-foreground"
            onClick={() => {
              setEditClient(null);
              form.reset({
                companyName: "",
                contactPerson: "",
                email: "",
                portalEmail: "",
                password: "",
                phone: "",
                gstNumber: "",
                industry: "",
                website: "",
                tier: "Standard",
                status: "active",
              });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Client
          </Button>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-card border-border">
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
                      <FormLabel>Company contact email</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@acme.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Portal login {editClient ? "(optional reset)" : "(required)"}
                  </p>
                  <FormField
                    control={form.control}
                    name="portalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portal login email (Gmail)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="client@gmail.com"
                            type="email"
                            {...field}
                            disabled={!!editClient && !!editClient.userId}
                          />
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
                        <FormLabel>
                          {editClient ? "New portal password (optional)" : "Portal password"}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Min. 8 characters" type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input placeholder="22AAAAA0000A1Z5" {...field} />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Tier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Premium">Premium</SelectItem>
                            <SelectItem value="Enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
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

      {statsLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard title="Companies" value={clientStats.total} hint="Registered clients" icon={Building} accent="violet" delay={0} />
          <StatCard title="Active" value={clientStats.active} hint="Active partnerships" icon={Users} accent="green" delay={1} />
          <StatCard title="Active projects" value={clientStats.activeProjects} hint="Across all companies" icon={Briefcase} accent="blue" delay={2} />
          <StatCard title="Inactive" value={clientStats.inactive} hint="Paused or churned" icon={TrendingUp} accent="amber" alert={clientStats.inactive > 0} delay={3} />
        </PageKpiRow>
      )}

      <Card className="bg-card">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <AdvancedTable 
              data={data?.clients || []} 
              columns={columns} 
              searchKey="companyName" 
              searchPlaceholder="Filter companies..." 
              filename="ClientsExport"
              viewStorageKey="companies"
              onRowClick={(client) => setSelectedClient(client)}
            />
          )}
        </CardContent>
      </Card>
      <DataPagination
        page={page}
        total={data?.total ?? 0}
        limit={PAGE_SIZE}
        onPageChange={setPage}
      />

      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/10">
                <AvatarImage src={selectedClient?.logoUrl || undefined} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">{selectedClient?.companyName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-base font-bold tracking-tight">{selectedClient?.companyName}</SheetTitle>
                <SheetDescription className="text-xs font-medium text-muted-foreground flex items-center"><Building className="h-3 w-3 mr-1" /> {selectedClient?.contactPerson}</SheetDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] py-0.5 bg-primary/5 font-medium capitalize">Client Portal User</Badge>
              <Badge variant="outline" className={`text-[10px] py-0.5 border-green-500/20 bg-green-500/10 text-green-600 font-medium capitalize ${selectedClient?.status !== 'active' ? 'opacity-50' : ''}`}>{selectedClient?.status}</Badge>
              {selectedClient && canViewAsClient(selectedClient) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-[10px] border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                  disabled={impersonatingUserId === selectedClient.userId || isImpersonating}
                  onClick={() => void handleViewAsClient(selectedClient)}
                >
                  <LogIn className="mr-1.5 h-3 w-3" />
                  {impersonatingUserId === selectedClient.userId ? "Opening…" : "View as client"}
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="overview" className="text-[10px] py-1">Overview</TabsTrigger>
              <TabsTrigger value="credentials" className="text-[10px] py-1 flex items-center" disabled={!selectedClient?.userId}><Key className="h-3 w-3 mr-1.5" /> Credential Vault</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Engagement Tier</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" /> 
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${(selectedClient as any)?.tier === 'Enterprise' ? 'bg-purple-500/10 text-purple-500' : (selectedClient as any)?.tier === 'Premium' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'}`}>
                      {(selectedClient as any)?.tier || "Standard"}
                    </span>
                  </p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Industry Vertical</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Building className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> {selectedClient?.industry || "General Market"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">GST Number</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Briefcase className="h-3.5 w-3.5 text-sky-500 shrink-0" /> {selectedClient?.gstNumber || "Not provided"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Client Since</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Calendar className="h-3.5 w-3.5 text-rose-500 shrink-0" /> {selectedClient?.clientSince ? new Date(selectedClient.clientSince).toLocaleDateString() : "Pending"}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50 col-span-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Account Email</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground break-all"><Mail className="h-3.5 w-3.5 text-primary shrink-0" /> {selectedClient?.email}</p>
                </div>
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md border border-border/50">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {selectedClient?.phone || "Not Provided"}</p>
                </div>
              </div>

              {(selectedClient as any)?.website && (
                <a 
                  href={(selectedClient as any).website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block group bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30 transition-all rounded-lg p-3 mt-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-cyan-500/10 p-2 rounded-md text-cyan-600 group-hover:scale-105 transition-transform"><Globe className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-cyan-600 transition-colors">Corporate Website</p>
                        <p className="text-[9px] text-muted-foreground">Click to open official organization web portal</p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              )}

              {!selectedClient?.userId && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-[10px] text-amber-600 flex gap-2 items-start mt-3">
                  <span className="mt-0.5">âš ï¸</span>
                  <div>
                    <p className="font-semibold">No Portal Access Linked</p>
                    <p className="text-amber-700/80 mt-0.5">This record has no associated portal account user, meaning access tracking and vault security tools are restricted for this client.</p>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="credentials" className="pt-3">
              <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-3 py-2 border-b border-border/60 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-medium text-primary">Client Portal Credentials Audit</p>
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent text-[9px] font-semibold text-muted-foreground">
                        <TableHead className="h-7 py-1 pl-3 text-center w-[50px]">Ver.</TableHead>
                        <TableHead className="h-7 py-1">Assigned By</TableHead>
                        <TableHead className="h-7 py-1">Date Set</TableHead>
                        <TableHead className="h-7 py-1 pr-3 text-right w-[120px]">Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingCredentials ? (
                        <TableRow><TableCell colSpan={4} className="h-12 text-center text-[10px] text-muted-foreground">Loading vault records...</TableCell></TableRow>
                      ) : credentials?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-12 text-center text-[10px] text-muted-foreground">No credential snapshots captured.</TableCell></TableRow>
                      ) : (
                        credentials?.map((cred: any) => (
                          <TableRow key={cred.id} className="text-[10px] group/row hover:bg-muted/20 border-border/30">
                            <TableCell className="py-1 pl-3 text-center font-mono text-muted-foreground bg-muted/10 font-medium">#{cred.entryNumber}</TableCell>
                            <TableCell className="py-1 font-medium">{cred.setBy}</TableCell>
                            <TableCell className="py-1 text-muted-foreground">{new Date(cred.setAt).toLocaleDateString()}</TableCell>
                            <TableCell className="py-1 pr-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={`font-mono select-all px-1.5 py-0.5 rounded ${revealedPasswords[cred.id] ? 'text-primary bg-primary/10 font-semibold text-[10px]' : 'text-muted-foreground/60 tracking-widest text-[8px]'}`}>
                                  {revealedPasswords[cred.id] || 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}
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
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/80 mt-2 px-1 italic flex items-start gap-1">
                <span>â„¹ï¸</span> Portals passwords decrypt for 10 seconds only. High-security tracing active.
              </p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
