import React, { useState } from "react";
import { useListRequests, useUpdateRequest } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AdminRequests() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | undefined>("pending");
  const { data, isLoading, refetch } = useListRequests({ status, limit: 50 });
  const updateMutation = useUpdateRequest();

  const handleUpdateStatus = (id: number, newStatus: "approved" | "rejected") => {
    updateMutation.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        toast.success(`Request ${newStatus} successfully`);
        refetch();
      },
      onError: () => {
        toast.error(`Failed to update request`);
      }
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Requests</h1>
          <p className="text-muted-foreground">Approve or reject developer resource requests</p>
        </div>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border">
          <Tabs value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v as any)}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All Requests</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Developer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No requests found for this status.
                  </TableCell>
                </TableRow>
              ) : (
                data?.requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.developerName}</TableCell>
                    <TableCell className="text-muted-foreground">{request.projectName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[300px]">
                        <span className="font-medium text-sm truncate">{request.title}</span>
                        <span className="text-xs text-muted-foreground truncate">{request.type.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getUrgencyColor(request.urgency)}>
                        {request.urgency.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        request.status === 'pending' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                        request.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                        'bg-red-500/10 text-red-500 border-red-500/20'
                      }>
                        {request.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600 border-green-500/20"
                            onClick={() => handleUpdateStatus(request.id, "approved")}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border-red-500/20"
                            onClick={() => handleUpdateStatus(request.id, "rejected")}
                            disabled={updateMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <MessageSquare className="h-4 w-4 mr-1" /> Details
                        </Button>
                      )}
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
