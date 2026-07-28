import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Bell,
  Sun,
  Moon,
  CheckCheck,
  PanelLeft,
  Menu,
  Search,
  MessageSquare,
  ChevronRight,
  Ticket,
  Bug,
  ListTodo,
  MessageCircle,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
  type Notification,
} from "@/api";
import { useNotificationClick } from "@/hooks/use-notification-click";
import { getNotificationTarget } from "@/lib/notification-navigation";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { QUERY_STALE } from "@/lib/query-config";
import { CommandPalette } from "@/components/CommandPalette";
import { ClockInButton } from "@/components/ClockInButton";
import { useQueryClient } from "@tanstack/react-query";
import { stopPersistentAlert } from "@/lib/notification-alert";
import { getRouteBreadcrumbs, getRouteMeta } from "@/lib/route-meta";
import {
  formatNavbarClock,
  getSearchShortcutLabel,
  getTimeGreeting,
} from "@/lib/navbar-utils";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

const spring = { type: "spring" as const, stiffness: 420, damping: 32 };

function notificationIcon(type: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("ticket")) return Ticket;
  if (t.includes("bug")) return Bug;
  if (t.includes("task")) return ListTodo;
  if (t.includes("comment") || t.includes("mention")) return MessageCircle;
  if (t.includes("work_session") || t.includes("session")) return Clock3;
  return AlertCircle;
}

function formatNotifTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function MobilePageTitle({ pathname, role }: { pathname: string; role?: string }) {
  const crumbs = getRouteBreadcrumbs(pathname, role);
  const meta = getRouteMeta(pathname);
  const title = crumbs[crumbs.length - 1]?.label ?? meta.title;

  return (
    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground md:hidden">
      {title}
    </p>
  );
}

function WayfinderTrail({ pathname, role }: { pathname: string; role?: string }) {
  const crumbs = getRouteBreadcrumbs(pathname, role);
  const meta = getRouteMeta(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 hidden flex-1 md:block">
      <ol className="flex flex-wrap items-center gap-1 text-[11px] font-medium sm:text-xs">
        <AnimatePresence mode="popLayout">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <motion.li
                key={`${crumb.label}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="flex items-center gap-1"
              >
                {i > 0 && (
                  <motion.span
                    layoutId={`crumb-sep-${pathname}-${i}`}
                    className="flex items-center text-muted-foreground/50"
                  >
                    <span className="mx-0.5 h-1 w-1 rounded-full bg-primary/50" />
                    <ChevronRight className="h-3 w-3 opacity-40" />
                  </motion.span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5",
                      isLast ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {crumb.label}
                  </span>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      <p className="mt-0.5 hidden truncate text-[11px] leading-snug text-muted-foreground sm:block lg:max-w-lg">
        {meta.description}
      </p>
    </nav>
  );
}

function OmniSlash({
  onOpen,
  shortcut,
}: {
  onOpen: () => void;
  shortcut: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      className={cn(
        "nexus-omni group relative flex min-w-0 flex-1 items-center overflow-hidden rounded-lg",
        "border border-dashed border-border/70 bg-muted/20 px-2.5 py-1.5 font-mono text-sm sm:px-3 sm:py-2",
        "transition-colors hover:border-primary/35 hover:bg-primary/5",
        "sm:max-w-[200px] md:max-w-xs lg:max-w-sm",
      )}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
    >
      <span className="shrink-0 font-bold text-primary">/</span>
      <span className="ml-1.5 truncate text-muted-foreground group-hover:text-foreground">
        jump to page
      </span>
      <span className="nexus-omni-cursor ml-0.5 inline-block h-4 w-0.5 bg-primary" />
      <span className="ml-auto hidden shrink-0 pl-3 text-[10px] text-muted-foreground md:inline">
        {shortcut}
      </span>
    </motion.button>
  );
}

function TimeRing({ now }: { now: Date }) {
  const total = 24 * 60;
  const current = now.getHours() * 60 + now.getMinutes();
  const progress = current / total;
  const r = 17;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  return (
    <div
      className="relative hidden h-11 w-11 shrink-0 md:block"
      title={now.toLocaleString()}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden>
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted/30"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums leading-none text-foreground">
        {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: false })}
      </span>
    </div>
  );
}

function OrbitDock({
  unreadCount,
  theme,
  onToggleTheme,
  onMarkAllRead,
  onNotificationClick,
  notifications,
  getTarget,
  markAllPending,
  notifMenuOpen,
  onNotifMenuOpenChange,
  notifListLoading,
  isNavigating,
}: {
  unreadCount: number;
  theme: string;
  onToggleTheme: () => void;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  notifications: Notification[] | undefined;
  getTarget: (notification: Notification) => { href: string; label: string } | null;
  markAllPending: boolean;
  notifMenuOpen: boolean;
  onNotifMenuOpenChange: (open: boolean) => void;
  notifListLoading: boolean;
  isNavigating: boolean;
}) {
  return (
    <LayoutGroup>
      <div className="orbit-dock flex items-center">
        <motion.div layout className="flex items-center">
          <motion.div layout whileHover={{ y: -2 }} transition={spring}>
            <Button
              variant="outline"
              size="icon"
              className="orbit-item relative z-10 h-10 w-10 rounded-full border-border/60 bg-card shadow-sm transition-[margin] duration-200 md:h-9 md:w-9"
              asChild
            >
              <Link href="/discussions" title="Discussions">
                <MessageSquare className="h-4 w-4 text-primary" />
              </Link>
            </Button>
          </motion.div>

          <motion.div layout whileHover={{ y: -2 }} transition={spring}>
            <Button
              variant="outline"
              size="icon"
              className="orbit-item relative z-20 -ml-2 h-10 w-10 rounded-full border-border/60 bg-card shadow-sm transition-[margin] duration-200 md:h-9 md:w-9"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </motion.div>

          <motion.div layout whileHover={{ y: -2 }} transition={spring}>
            <DropdownMenu open={notifMenuOpen} onOpenChange={onNotifMenuOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={
                    unreadCount > 0
                      ? `Notifications, ${unreadCount} unread`
                      : "Notifications"
                  }
                  className="orbit-item relative z-30 -ml-2 h-10 w-10 rounded-full border-border/60 bg-card shadow-sm transition-[margin] duration-200 md:h-9 md:w-9"
                >
                  <Bell className={cn("h-4 w-4", unreadCount > 0 && "text-primary")} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl p-0 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/30 px-3 py-2.5">
                  <div className="min-w-0">
                    <DropdownMenuLabel className="p-0 text-sm font-semibold tracking-tight">
                      Notifications
                    </DropdownMenuLabel>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : "You're up to date"}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      disabled={markAllPending}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMarkAllRead();
                      }}
                    >
                      <CheckCheck className="mr-1 h-3.5 w-3.5" />
                      Mark all
                    </Button>
                  )}
                </div>

                {notifListLoading && !notifications?.length ? (
                  <div className="space-y-2 px-3 py-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-2.5 animate-pulse">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1.5 py-0.5">
                          <div className="h-3 w-3/4 rounded bg-muted" />
                          <div className="h-2.5 w-full rounded bg-muted/70" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications?.length ? (
                  <div className="dialog-scroll max-h-[min(22rem,50vh)] overflow-y-auto">
                    {notifications.map((n) => {
                      const Icon = notificationIcon(n.type);
                      const target = getTarget(n);
                      const unread = !n.readAt;
                      return (
                        <DropdownMenuItem
                          key={n.id}
                          disabled={isNavigating}
                          className={cn(
                            "mx-0 cursor-pointer rounded-none border-b border-border/40 px-3 py-2.5 focus:bg-muted/60",
                            unread && "bg-primary/[0.04]",
                          )}
                          onSelect={(e) => {
                            e.preventDefault();
                            onNotificationClick(n);
                          }}
                        >
                          <div className="flex w-full items-start gap-2.5">
                            <div
                              className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <span
                                  className={cn(
                                    "line-clamp-1 flex-1 text-sm leading-snug",
                                    unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                                  )}
                                >
                                  {n.title}
                                </span>
                                {unread && (
                                  <span
                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                                    aria-hidden
                                  />
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {n.body}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted-foreground/80">
                                  {formatNotifTime(n.createdAt)}
                                </span>
                                {target && (
                                  <span className="text-[10px] font-medium text-primary">
                                    {target.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Bell className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">All caught up</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      New alerts will show up here
                    </p>
                  </div>
                )}

                <div className="border-t border-border/70 bg-muted/20 p-1.5">
                  <DropdownMenuItem
                    asChild
                    className="justify-center rounded-lg text-sm font-medium text-primary"
                  >
                    <Link href="/notifications">View all notifications</Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </motion.div>
      </div>
    </LayoutGroup>
  );
}

type NavbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileNav?: () => void;
};

export function Navbar({ sidebarCollapsed, onToggleSidebar, onOpenMobileNav }: NavbarProps) {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const { user } = useAuth();
  const { unreadNotificationCount, isConnected } = useRealtime();
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const { data: notificationsData, isLoading: notifListLoading, isFetching: notifListFetching } =
    useListNotifications(
      { unreadOnly: true, limit: 10 },
      {
        query: {
          queryKey: getListNotificationsQueryKey({ unreadOnly: true, limit: 10 }),
          // Fetch only when the dropdown is open — badge count comes from RealtimeContext (limit: 1).
          enabled: !!user && notifMenuOpen,
          staleTime: QUERY_STALE.notificationsBadge ?? QUERY_STALE.list,
        },
      },
    );
  const unreadCount = unreadNotificationCount;
  const { theme, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const searchShortcut = getSearchShortcutLabel();

  const markAllRead = useMarkAllNotificationsRead();
  const { handleNotificationClick, getTarget, isNavigating } = useNotificationClick({
    unreadCount,
    onAfterNavigate: () => setNotifMenuOpen(false),
  });

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const greeting = getTimeGreeting(now.getHours());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

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

  const handleMarkAllRead = () => {
    queryClient.setQueryData(
      getListNotificationsQueryKey({ unreadOnly: true, limit: 1 }),
      (prev: { unreadCount?: number; notifications?: Notification[]; total?: number } | undefined) =>
        prev ? { ...prev, unreadCount: 0, notifications: [], total: 0 } : prev,
    );
    queryClient.setQueryData(
      getListNotificationsQueryKey({ unreadOnly: true, limit: 10 }),
      (prev: { unreadCount?: number; notifications?: Notification[]; total?: number } | undefined) =>
        prev ? { ...prev, unreadCount: 0, notifications: [], total: 0 } : prev,
    );
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        stopPersistentAlert();
        toast.success("All notifications marked as read");
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err, "Failed to mark notifications as read"));
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      },
    });
  };

  return (
    <header className="sticky top-0 z-20 shrink-0">
      <div className="app-shell-container pt-3 pb-2 sm:pt-3.5 sm:pb-2.5">
        <motion.div
          className="nexus-bridge relative flex flex-col gap-2 p-2.5 md:flex-row md:items-center md:gap-3 md:p-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
        <div className="flex min-w-0 items-center gap-2 md:min-w-[200px] md:flex-1 lg:min-w-[240px]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg md:hidden"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "hidden h-9 w-9 shrink-0 rounded-lg md:inline-flex",
              sidebarCollapsed && "bg-primary/10 text-primary ring-1 ring-primary/25",
            )}
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <MobilePageTitle pathname={location} role={user?.role} />
          <WayfinderTrail pathname={location} role={user?.role} />
        </div>

        <div className="hidden min-w-0 items-center gap-2 md:flex md:flex-1 md:justify-center md:px-1">
          <OmniSlash onOpen={() => setPaletteOpen(true)} shortcut={searchShortcut} />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 md:gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg md:hidden"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
          <div className="hidden items-center gap-2 md:flex">
            <TimeRing now={now} />
            <span className="hidden text-xs tabular-nums text-muted-foreground xl:inline">
              {formatNavbarClock(now)}
            </span>
          </div>

          <div className="hidden items-center gap-2 border-l border-border/50 pl-2 sm:flex">
            <div className="relative">
              <Avatar className="h-8 w-8 border border-border/60">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/15 text-[10px] font-bold text-primary">
                  {user?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span
                title={isConnected ? "Real-time connected" : "Reconnecting…"}
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                  isConnected ? "bg-emerald-500" : "bg-amber-400",
                )}
              />
            </div>
            <div className="hidden min-w-0 text-right lg:block">
              <p className="truncate text-[10px] text-muted-foreground">{greeting}</p>
              <p className="truncate text-xs font-semibold">{firstName ?? "there"}</p>
            </div>
          </div>

          <ClockInButton />

          <OrbitDock
            unreadCount={unreadCount}
            theme={theme}
            onToggleTheme={toggleTheme}
            onMarkAllRead={handleMarkAllRead}
            onNotificationClick={handleNotificationClick}
            notifications={notificationsData?.notifications}
            getTarget={getTarget}
            markAllPending={markAllRead.isPending}
            notifMenuOpen={notifMenuOpen}
            onNotifMenuOpenChange={setNotifMenuOpen}
            notifListLoading={notifListLoading || (notifListFetching && !notificationsData)}
            isNavigating={isNavigating}
          />
        </div>
        </motion.div>
      </div>
    </header>
  );
}
