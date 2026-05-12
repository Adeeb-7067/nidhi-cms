import React, { useState } from "react";
import { useListBugs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Bug as BugIcon, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DevBugs() {
  const { data, isLoading } = useListBugs({ limit: 50 });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bug Tracker</h1>
          <p className="text-muted-foreground">Report and track project issues</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Report Bug
        </Button>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search bugs..." className="pl-9" />
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
              ) : data?.bugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <BugIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No bugs found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.bugs.map((bug) => (
                  <TableRow key={bug.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{bug.bugNumber}</TableCell>
                    <TableCell className="font-medium">{bug.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{bug.projectName}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${getSeverityColor(bug.severity)} hover:${getSeverityColor(bug.severity)}`}>
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
