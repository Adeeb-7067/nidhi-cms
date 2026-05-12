import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { Smartphone, CheckCircle, Clock } from "lucide-react";

export default function ClientPortal() {
  const { user } = useAuth();
  const { data, isLoading } = useListProjects({ limit: 1 }); // Assuming client sees their active project

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Client Portal</h1>
        <Skeleton className="h-[200px] w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  const project = data?.projects[0];

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <h3 className="text-xl font-medium mb-2">No active projects</h3>
            <p className="text-muted-foreground">We are currently setting up your workspace. Check back soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionData = [
    { name: "Progress", value: project.completionPct, fill: "hsl(var(--primary))" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground">Here is the status of your project</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-8 border border-border flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-4">
          <Badge variant="outline" className="bg-background/50 backdrop-blur-sm px-3 py-1 text-sm border-primary/50 text-primary">
            {project.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{project.name}</h2>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            {project.description || "Development is proceeding according to schedule."}
          </p>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center text-sm font-medium">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              Target Deadline: <span className="ml-2 text-foreground">{new Date(project.deadline).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="h-48 w-48 shrink-0 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              innerRadius="80%" 
              outerRadius="100%" 
              data={completionData} 
              startAngle={90} 
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{project.completionPct}%</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Complete</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="mr-2 h-5 w-5 text-primary" />
              Latest Release
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-border rounded-lg p-6 text-center bg-muted/20">
              <h3 className="text-2xl font-bold mb-1">v1.0.4-beta</h3>
              <p className="text-sm text-muted-foreground mb-4">Released on {new Date().toLocaleDateString()}</p>
              <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium w-full transition-colors">
                Download APK
              </button>
            </div>
            <div className="text-sm">
              <h4 className="font-semibold mb-2">What's new:</h4>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside pl-4">
                <li>Fixed authentication flow on iOS 16</li>
                <li>Improved performance of dashboard charts</li>
                <li>Updated branding assets</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {/* Mockup activity timeline */}
              {[1, 2, 3].map((item, i) => (
                <div key={item} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <span className="text-xs font-bold">{i+1}</span>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">Feature Completed</h4>
                      <time className="text-xs text-muted-foreground">{i+1} days ago</time>
                    </div>
                    <p className="text-xs text-muted-foreground">Backend API integration finalized.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
