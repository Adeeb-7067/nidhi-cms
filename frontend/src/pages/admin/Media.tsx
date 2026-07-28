import { HardDrive } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { MediaDesktopExplorer } from "@/modules/marketing/components";

export default function AdminMediaPage() {
  return (
    <PortalPageShell>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold tracking-tight">Media</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Company storage for policies, templates, brand files, and shared documents.
        </p>
      </div>
      <MediaDesktopExplorer source="admin" />
    </PortalPageShell>
  );
}
