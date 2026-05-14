import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Building2, 
  BarChart3, 
  Inbox,
  LogOut,
  Bug,
  Smartphone,
  FileText,
  Clock,
  Zap,
  Settings,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useListRequests, useListBugs, getListRequestsQueryKey, getListBugsQueryKey } from "@workspace/api-client-react";

interface NavSection {
  label: string;
  role: string[];
  items: NavItem[];
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  role: string[];
  showBadge?: boolean;
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const { data: pendingRequests } = useListRequests(
    { status: "pending", limit: 1 },
    { 
      query: { 
        enabled: user?.role === "super_admin",
        queryKey: getListRequestsQueryKey({ status: "pending", limit: 1 })
      } 
    }
  );

  const { data: openBugs } = useListBugs(
    { status: "open", limit: 1 },
    { 
      query: { 
        enabled: user?.role === "developer",
        queryKey: getListBugsQueryKey({ status: "open", limit: 1 })
      } 
    }
  );

  if (!user) return null;

  const sections: NavSection[] = [
    {
      label: "Overview",
      role: ["super_admin", "developer", "client"],
      items: [
        { 
          title: user.role === "super_admin" ? "Dashboard" : user.role === "developer" ? "Workspace" : "Portal", 
          href: user.role === "super_admin" ? "/admin" : user.role === "developer" ? "/dev" : "/client", 
          icon: LayoutDashboard, 
          role: ["super_admin", "developer", "client"] 
        },
      ]
    },
    {
      label: "Workspace",
      role: ["developer"],
      items: [
        { title: "Daily Logs", href: "/dev/logs", icon: Clock, role: ["developer"] },
        { title: "Bug Tracker", href: "/dev/bugs", icon: Bug, role: ["developer"], showBadge: true },
        { title: "Releases", href: "/dev/apk", icon: Smartphone, role: ["developer"] },
        { title: "Reports", href: "/dev/reports", icon: FileText, role: ["developer"] },
        { title: "Requests", href: "/dev/requests", icon: Inbox, role: ["developer"] },
      ]
    },
    {
      label: "Manage",
      role: ["super_admin"],
      items: [
        { title: "Projects", href: "/admin/projects", icon: Briefcase, role: ["super_admin"] },
        { title: "Employees", href: "/admin/employees", icon: Users, role: ["super_admin"] },
        { title: "Clients", href: "/admin/clients", icon: Building2, role: ["super_admin"] },
        { title: "Settings", href: "/admin/settings", icon: Settings, role: ["super_admin"] },
      ]
    },
    {
      label: "Insights",
      role: ["super_admin", "client"],
      items: [
        { title: "Analytics", href: user.role === "super_admin" ? "/admin/analytics" : "/client/analytics", icon: BarChart3, role: ["super_admin", "client"] },
        { title: "Requests", href: "/admin/requests", icon: Inbox, role: ["super_admin"], showBadge: true },
        { title: "Releases", href: "/client/apk", icon: Smartphone, role: ["client"] },
      ]
    }
  ];

  const filteredSections = sections.filter(section => section.role.includes(user.role))
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.role.includes(user.role))
    }))
    .filter(section => section.items.length > 0);

  return (
    <div className="flex flex-col h-screen w-56 border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-border flex items-center gap-3 h-11">
        <div className="h-7 w-7 bg-primary rounded flex items-center justify-center shrink-0">
          <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
        </div>
        <div className="font-semibold text-sm tracking-tight truncate">Nexus CMS</div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredSections.map((section) => (
          <div key={section.label}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40 px-3 mb-1 mt-4">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/admin" && item.href !== "/dev" && item.href !== "/client");
                const Icon = item.icon;
                
                let badgeCount = 0;
                if (item.showBadge) {
                  if (item.href === "/admin/requests") badgeCount = pendingRequests?.total || 0;
                  if (item.href === "/dev/bugs") badgeCount = openBugs?.total || 0;
                }

                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 px-2.5 py-1.5 text-[11px] font-medium transition-colors border-l-2",
                    isActive 
                      ? "bg-sidebar-accent/10 text-foreground border-primary" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 border-transparent"
                  )}>
                    <Icon size={14} />
                    {item.title}
                    {badgeCount > 0 && (
                      <span className="ml-auto h-4 px-1 rounded-full bg-destructive/15 text-destructive text-[9px] font-medium flex items-center">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-border">
        <Link href="/profile">
          <div className="flex items-center gap-3 mb-4 px-2 cursor-pointer group">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar className="h-7 w-7 border border-border transition-colors group-hover:border-primary">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col truncate min-w-0">
                    <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">{user.name}</span>
                    <div className="flex items-center">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                        user.role === "super_admin" ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border/50"
                      )}>
                        {user.role.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[10px]">
                View Profile
              </TooltipContent>
            </Tooltip>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground hover:text-foreground h-8 px-2 text-xs" 
          onClick={logout}
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
