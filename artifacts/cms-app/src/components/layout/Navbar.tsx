import React from "react";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useListNotifications } from "@workspace/api-client-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { data: notificationsData } = useListNotifications({ unreadOnly: true, limit: 5 });
  const unreadCount = notificationsData?.unreadCount || 0;

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search projects, bugs, clients..." 
            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1 h-9 text-sm"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
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
