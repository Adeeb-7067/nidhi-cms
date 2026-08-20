import React from "react";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { WebsiteOutboxMonitor } from "@/components/website/WebsiteOutboxMonitor";
import { CheckCircle2, RefreshCw, Cpu } from "lucide-react";

export default function WebsiteOutboxPage() {
  return (
    <PortalPageShell className="px-6 py-4 space-y-6">
      <PortalPageHero
        title="Customer Submissions & Contact Leads"
        subtitle="View incoming contact forms, customer inquiry messages, and job applicant submissions."
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Connected Systems", value: "Sales & HR", icon: Cpu, hint: "Automatic Lead Delivery", accent: "blue" },
          { title: "Delivery Status", value: "Delivered", icon: CheckCircle2, hint: "Safe Storage", accent: "green" },
          { title: "Sync Mode", value: "Realtime", icon: RefreshCw, hint: "Instant Lead Intake", accent: "violet" },
        ]}
      />
      <div>
        <WebsiteOutboxMonitor />
      </div>
    </PortalPageShell>
  );
}
