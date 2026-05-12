import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Smartphone } from "lucide-react";

export default function DevApk() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">APK Releases</h1>
          <p className="text-muted-foreground">Upload and manage application builds</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Upload Release
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <Smartphone className="h-16 w-16 mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-foreground mb-2">Select a project</h3>
          <p className="text-sm max-w-md">Please select a project from the sidebar to view its APK releases or upload a new build.</p>
        </CardContent>
      </Card>
    </div>
  );
}
