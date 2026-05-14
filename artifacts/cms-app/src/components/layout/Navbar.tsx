import React, { useState, useEffect } from "react";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListNotifications } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { CommandPalette } from "@/components/CommandPalette";
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
  const { theme, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const getBreadcrumbs = () => {
    const parts = location.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Home", href: "/" }];

    const breadcrumbs = [];
    let currentPath = "";

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
      let label = pathMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
      if (!isNaN(Number(part)) || part.length > 20) {
        label = "Detail";
      }
      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="h-12 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-5 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage className="font-semibold text-xs">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground text-xs">
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

      <div className="flex items-center w-full max-w-xs mx-4">
        <button
          onClick={() => setPaletteOpen(true)}
          className="w-full flex items-center gap-2 bg-muted/30 hover:bg-muted/50 border border-border rounded-md h-8 px-2.5 text-xs text-muted-foreground transition-colors group"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
          <span className="flex-1 text-left text-muted-foreground/60">Search...</span>
          <div className="hidden sm:flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground/40 pointer-events-none select-none shrink-0">
            <kbd className="h-4 min-w-[16px] flex items-center justify-center rounded border bg-muted px-1 font-sans">⌘</kbd>
            <kbd className="h-4 min-w-[16px] flex items-center justify-center rounded border bg-muted px-1 font-sans">K</kbd>
          </div>
        </button>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      
      <div className="flex items-center gap-1.5">
        <div className="hidden lg:block text-xs text-muted-foreground mr-1">
          {today}
        </div>

        <div className="h-4 w-px bg-border hidden lg:block mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun size={14} className="text-muted-foreground" />
          ) : (
            <Moon size={14} className="text-muted-foreground" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
              <Bell size={14} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs font-semibold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
              <div className="max-h-[280px] overflow-y-auto">
                {notificationsData.notifications.map(notification => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
                    <span className="text-xs font-medium">{notification.title}</span>
                    <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</span>
                    <span className="text-[10px] text-muted-foreground mt-1.5 opacity-60">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No new notifications
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary cursor-pointer text-xs">
              View all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
