import React from "react";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { WebsiteMediaLibrary } from "@/components/website/WebsiteMediaLibrary";
import { CloudUpload, Image as ImageIcon, ShieldCheck } from "lucide-react";

export default function WebsiteMediaPage() {
  return (
    <PortalPageShell className="px-6 py-4 space-y-6">
      <PortalPageHero
        title="Media & Photo Library"
        subtitle="Upload photos, banner graphics, downloadable documents, and videos to use on your website."
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Storage Space", value: "Cloud Storage", icon: CloudUpload, hint: "High-Speed CDN", accent: "blue" },
          { title: "File Support", value: "Images & Video", icon: ImageIcon, hint: "WebP / PNG / MP4", accent: "green" },
          { title: "Security Status", value: "Protected", icon: ShieldCheck, hint: "Secure Cloud Upload", accent: "sky" },
        ]}
      />
      <div>
        <WebsiteMediaLibrary />
      </div>
    </PortalPageShell>
  );
}
