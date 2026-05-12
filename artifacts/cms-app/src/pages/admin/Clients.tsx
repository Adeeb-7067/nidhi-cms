import React, { useState } from "react";
import { useListClients } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Mail, Building, Briefcase } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminClients() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListClients({ search, limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search clients..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Active Projects</TableHead>
                <TableHead>Client Since</TableHead>
                <TableHead className="text-right">Status</TableHead>
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
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.clients.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-md">
                          <AvatarImage src={client.logoUrl || undefined} />
                          <AvatarFallback className="bg-secondary/20 text-secondary rounded-md">
                            <Building className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{client.companyName}</p>
                          <p className="text-xs text-muted-foreground">{client.businessId || 'No ID'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{client.contactPerson}</span>
                        <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                          <Mail className="h-3 w-3 mr-1" /> {client.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                        {client.activeProjectCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(client.clientSince).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={client.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
                        {client.status.replace('_', ' ').toUpperCase()}
                      </Badge>
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
