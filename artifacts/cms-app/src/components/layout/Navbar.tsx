import React from "react";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useListNotifications } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Navbar() {
  const { data: notificationsData } = useListNotifications({ unreadOnly: true, limit: 5 });
  const unreadCount = notificationsData?.unreadCount || 0;
  const [location] = useLocation();

  const getBreadcrumbs = () => {
    const parts = location.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Home", href: "/" }];

    const breadcrumbs = [];
    let currentPath = "";

    // Map common paths to readable names
    const pathMap: Record<string, string> = {
      admin: "Admin",
      dev: "Developer",
      client: "Client",
      projects: "Projects",
      employees: "Employees",
      clients: "Clients",
      analytics: "Analytics",
      requests: "Requests",
      logs: "Daily Logs",
      bugs: "Bug Tracker",
      apk: "Releases",
      reports: "Reports",
      workspace: "Workspace",
      portal: "Portal"
    };

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      
      // Try to get a readable label, otherwise use the part itself (capitalized)
      let label = pathMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
      
      // Special case for project IDs or other IDs in the URL
      if (!isNaN(Number(part)) || part.length > 20) {
        // If it's the last part and looks like an ID, maybe call it "Details" or similar
        // but for now let's just use "Detail"
        label = "Detail";
      }

      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage className="font-bold">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center w-full max-w-sm mx-4">
        <div className="relative w-full group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            type="search" 
            placeholder="Search..." 
            className="w-full bg-muted/30 pl-9 pr-12 border-border hover:bg-muted/50 focus-visible:ring-1 h-9 text-sm transition-colors"
          />
          <div className="absolute right-2 top-2 hidden sm:flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50 pointer-events-none select-none">
            <kbd className="h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1.5 font-sans">⌘</kbd>
            <kbd className="h-5 min-w-[20px] items-center justify-center rounded border bg-muted px-1.5 font-sans">K</kbd>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden lg:block text-sm text-muted-foreground">
          {today}
        </div>
        
        <div className="h-4 w-px bg-border hidden lg:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
              <Bell size={18} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto">
                {notificationsData.notifications.map(notification => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
                    <span className="text-sm font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2 mt-1">{notification.body}</span>
                    <span className="text-[10px] text-muted-foreground mt-2 opacity-70">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary cursor-pointer">
              View all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
