import React from "react";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { WebsiteRedirectManager } from "@/components/website/WebsiteRedirectManager";
import { ShieldAlert, CheckCircle2, Activity } from "lucide-react";

export default function WebsiteRedirectsPage() {
  return (
    <PortalPageShell className="px-6 py-4 space-y-6">
      <PortalPageHero
        title="Website Links & Redirect Rules"
        subtitle="Automatically send website visitors from old web addresses to your new website pages."
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Active Redirects", value: "Custom Rules", icon: Activity, hint: "Auto Link Routing", accent: "blue" },
          { title: "Protection", value: "Active", icon: ShieldAlert, hint: "Prevents Broken Links", accent: "green" },
          { title: "Redirect Type", value: "301 Permanent", icon: CheckCircle2, hint: "Google Approved", accent: "sky" },
        ]}
      />
      <div>
        <WebsiteRedirectManager />
      </div>
    </PortalPageShell>
  );
}
