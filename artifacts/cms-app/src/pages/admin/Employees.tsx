import React, { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Mail, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminEmployees() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListUsers({ role: "developer", search, limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your agency team members</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search employees..." 
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
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Last Login</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.users.map((user) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                            <Mail className="h-3 w-3 mr-1" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.designation || "Developer"}</span>
                        <span className="text-xs text-muted-foreground">{user.subType || "General"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{user.employeeId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {user.lastLoginAt ? (
                        <div className="flex items-center justify-end">
                          <Clock className="mr-1.5 h-3.5 w-3.5" />
                          {new Date(user.lastLoginAt).toLocaleDateString()}
                        </div>
                      ) : "Never"}
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
