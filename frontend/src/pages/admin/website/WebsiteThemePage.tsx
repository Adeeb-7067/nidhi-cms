import React from "react";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { WebsiteThemeEditor } from "@/components/website/WebsiteThemeEditor";
import { Type, Sliders, Code2 } from "lucide-react";

export default function WebsiteThemePage() {
  return (
    <PortalPageShell className="px-6 py-4 space-y-6">
      <PortalPageHero
        title="Brand Colors, Fonts & Website Styling"
        subtitle="Choose your website's main colors, text font styles, and header branding."
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Active Website Font", value: "Inter / Outfit", icon: Type, hint: "Primary Typography", accent: "violet" },
          { title: "Brand Colors", value: "Indigo & Purple", icon: Sliders, hint: "Main Theme Accent", accent: "sky" },
          { title: "Custom Styles", value: "Active", icon: Code2, hint: "Custom Site Theme", accent: "green" },
        ]}
      />
      <div>
        <WebsiteThemeEditor />
      </div>
    </PortalPageShell>
  );
}
