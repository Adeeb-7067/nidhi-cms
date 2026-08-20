import React from "react";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { WebsiteNavigationBuilder } from "@/components/website/WebsiteNavigationBuilder";
import { Link as LinkIcon, Layers, Radio } from "lucide-react";

export default function WebsiteNavigationPage() {
  return (
    <PortalPageShell className="px-6 py-4 space-y-6">
      <PortalPageHero
        title="Header & Footer Navigation Menus"
        subtitle="Organize website navigation links, top menu bars, and footer link categories."
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Top Menu Links", value: "6 Main Links", icon: LinkIcon, hint: "Header Menu Bar", accent: "blue" },
          { title: "Footer Link Groups", value: "4 Columns", icon: Layers, hint: "Footer Links", accent: "violet" },
          { title: "Update Speed", value: "Instant", icon: Radio, hint: "Automatic Website Sync", accent: "green" },
        ]}
      />
      <div>
        <WebsiteNavigationBuilder />
      </div>
    </PortalPageShell>
  );
}
