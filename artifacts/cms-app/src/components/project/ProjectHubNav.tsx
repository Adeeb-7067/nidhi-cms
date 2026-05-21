import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Rocket,
  Bug,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type ProjectHubTab =
  | "overview"
  | "inventory"
  | "timeline"
  | "apk"
  | "bugs"
  | "logs"
  | "team"
  | "comments"
  | "requests"
  | "analytics"
  | "history";

type HubSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  tab: ProjectHubTab;
  children?: { id: ProjectHubTab; label: string }[];
};

const SECTIONS: HubSection[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, tab: "overview" },
  { id: "resources", label: "Resources", icon: FolderOpen, tab: "inventory" },
  {
    id: "delivery",
    label: "Delivery",
    icon: Rocket,
    tab: "timeline",
    children: [
      { id: "timeline", label: "Timeline" },
      { id: "apk", label: "Releases" },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    icon: Bug,
    tab: "bugs",
    children: [
      { id: "bugs", label: "Bugs" },
      { id: "logs", label: "Logs" },
    ],
  },
  {
    id: "collaboration",
    label: "Team",
    icon: Users,
    tab: "team",
    children: [
      { id: "team", label: "Members" },
      { id: "comments", label: "Comments" },
      { id: "requests", label: "Requests" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: BarChart3,
    tab: "analytics",
    children: [
      { id: "analytics", label: "Analytics" },
      { id: "history", label: "History" },
    ],
  },
];

function sectionForTab(tab: ProjectHubTab): HubSection {
  return (
    SECTIONS.find((s) => s.tab === tab || s.children?.some((c) => c.id === tab)) ?? SECTIONS[0]
  );
}

interface ProjectHubNavProps {
  value: ProjectHubTab;
  onChange: (tab: ProjectHubTab) => void;
}

export function ProjectHubNav({ value, onChange }: ProjectHubNavProps) {
  const activeSection = sectionForTab(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const isActive = activeSection.id === section.id;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.children ? section.children[0].id : section.tab)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border/60 hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {section.label}
            </button>
          );
        })}
      </div>

      {activeSection.children && activeSection.children.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/40 p-1 w-fit">
          {activeSection.children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => onChange(child.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                value === child.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SECTIONS };
