import { Link } from "wouter";
import { MonitoringAnalyticsPanel } from "@/components/monitoring/MonitoringAnalyticsPanel";
import {
  PortalPageShell,
  PortalPageHero,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { Button } from "@/components/ui/button";
import { Camera, ClipboardList } from "lucide-react";

export default function WorkAnalyticsPage() {
  return (
    <PortalPageShell>
      <PortalPageHero
        title="Monitoring analytics"
        subtitle="Work sessions, clock vs log alignment, consent coverage, and screenshot activity"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className={portalActionButtonClass()}>
              <Link href="/admin/attendance">
                <ClipboardList className="mr-2 h-4 w-4" />
                Live attendance
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className={portalActionButtonClass()}>
              <Link href="/admin/screenshots">
                <Camera className="mr-2 h-4 w-4" />
                Screenshots
              </Link>
            </Button>
          </div>
        }
      />

      <MonitoringAnalyticsPanel />
    </PortalPageShell>
  );
}
