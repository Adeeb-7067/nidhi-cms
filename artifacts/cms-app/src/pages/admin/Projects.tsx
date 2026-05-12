import React, { useState } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Calendar, Clock, LayoutGrid, List as ListIcon, Briefcase, Users } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProjects() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data, isLoading } = useListProjects({ search, limit: 50 });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage and track all client projects</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
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
          {data?.projects.map((project) => (
            <Link key={project.id} href={`/admin/projects/${project.id}`}>
              <Card className="bg-card hover:bg-card/80 transition-colors cursor-pointer border-border h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className={getStatusColor(project.status)}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </Badge>
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
                      <div className="font-medium">{new Date(project.deadline).toLocaleDateString()}</div>
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
                    <div>
                      {project.techStack.slice(0, 2).map(tech => (
                        <span key={tech} className="mr-2 inline-block">{tech}</span>
                      ))}
                      {project.techStack.length > 2 && "..."}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
