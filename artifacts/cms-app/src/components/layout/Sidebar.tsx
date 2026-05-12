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
  Settings,
  Bug,
  Smartphone,
  FileText,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  role: string[];
}

const navItems: NavItem[] = [
  // Super Admin
  { title: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} />, role: ["super_admin"] },
  { title: "Projects", href: "/admin/projects", icon: <Briefcase size={18} />, role: ["super_admin"] },
  { title: "Employees", href: "/admin/employees", icon: <Users size={18} />, role: ["super_admin"] },
  { title: "Clients", href: "/admin/clients", icon: <Building2 size={18} />, role: ["super_admin"] },
  { title: "Analytics", href: "/admin/analytics", icon: <BarChart3 size={18} />, role: ["super_admin"] },
  { title: "Requests", href: "/admin/requests", icon: <Inbox size={18} />, role: ["super_admin"] },
  
  // Developer / QA
  { title: "Workspace", href: "/dev", icon: <LayoutDashboard size={18} />, role: ["developer"] },
  { title: "Daily Logs", href: "/dev/logs", icon: <Clock size={18} />, role: ["developer"] },
  { title: "Bugs", href: "/dev/bugs", icon: <Bug size={18} />, role: ["developer"] },
  { title: "Releases", href: "/dev/apk", icon: <Smartphone size={18} />, role: ["developer"] },
  { title: "Reports", href: "/dev/reports", icon: <FileText size={18} />, role: ["developer"] },
  
  // Client
  { title: "Portal", href: "/client", icon: <LayoutDashboard size={18} />, role: ["client"] },
  { title: "Analytics", href: "/client/analytics", icon: <BarChart3 size={18} />, role: ["client"] },
  { title: "Releases", href: "/client/apk", icon: <Smartphone size={18} />, role: ["client"] },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  const filteredNavItems = navItems.filter(item => item.role.includes(user.role));

  return (
    <div className="flex flex-col h-screen w-64 border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="h-8 w-8 bg-primary rounded flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold">X</span>
        </div>
        <div className="font-semibold text-lg tracking-tight truncate">Nexus CMS</div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">Menu</div>
        {filteredNavItems.map((item) => {
          const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/admin" && item.href !== "/dev" && item.href !== "/client");
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}>
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.designation || user.role}</span>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
