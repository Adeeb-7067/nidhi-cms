import React, { useEffect, useState, useCallback, memo } from "react";
import { Link, useLocation } from "wouter";
import { motion, LayoutGroup } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, LogOut } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useListRequests,
  useListBugs,
  getListRequestsQueryKey,
  getListBugsQueryKey,
} from "@workspace/api-client-react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { QUERY_STALE } from "@/lib/query-config";
import {
  getNavSections,
  getHomeHref,
  isNavActive,
  findActiveNavGroupLabel,
  getSectionDefaultHref,
  isPathInSection,
  type UserRole,
  type NavSection,
} from "@/lib/navigation";

const spring = { type: "spring" as const, stiffness: 380, damping: 28 };

function useBadgeCounts(role: UserRole) {
  const { unreadNotificationCount } = useRealtime();
  const { data: pendingRequests } = useListRequests(
    { status: "pending", limit: 1 },
    {
      query: {
        enabled: role === "super_admin",
        staleTime: QUERY_STALE.list,
        queryKey: getListRequestsQueryKey({ status: "pending", limit: 1 }),
      },
    },
  );
  const { data: openBugs } = useListBugs(
    { status: "open", limit: 1 },
    {
      query: {
        enabled: role === "developer" || role === "tester",
        staleTime: QUERY_STALE.list,
        queryKey: getListBugsQueryKey({ status: "open", limit: 1 }),
      },
    },
  );
  return {
    requests: pendingRequests?.total ?? 0,
    bugs: openBugs?.total ?? 0,
    notifications: unreadNotificationCount,
  };
}

function SidebarNavLink({
  href,
  active,
  children,
  count,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <Link href={href} className="block outline-none">
      <motion.div
        className={cn(
          "group relative flex items-center gap-2 rounded-md px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide",
          active
            ? "bg-sidebar-primary-foreground/18 text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-primary-foreground/72 hover:bg-sidebar-primary-foreground/10 hover:text-sidebar-primary-foreground",
        )}
        whileHover={{ x: active ? 0 : 3 }}
        whileTap={{ scale: 0.98 }}
        transition={spring}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-bar"
            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-sidebar-primary-foreground"
            transition={spring}
          />
        )}
        <span className="flex-1 truncate pl-1">{children}</span>
        {count != null && count > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold",
              active ? "bg-sidebar-primary-foreground/25" : "bg-destructive text-destructive-foreground",
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
        {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />}
      </motion.div>
    </Link>
  );
}

type SidebarProps = {
  collapsed?: boolean;
};

export const Sidebar = memo(function Sidebar({ collapsed = false }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const badges = useBadgeCounts((user?.role ?? "developer") as UserRole);

  const role = user?.role as UserRole;
  const sections = user ? getNavSections(role) : [];
  const homeHref = user ? getHomeHref(role) : "/login";

  const [activeGroup, setActiveGroup] = useState(() =>
    sections.length ? (findActiveNavGroupLabel(sections, location) ?? sections[0].label) : "",
  );

  useEffect(() => {
    const label = findActiveNavGroupLabel(sections, location);
    if (label) setActiveGroup(label);
  }, [location, sections]);

  const activeSection = sections.find((s) => s.label === activeGroup) ?? sections[0];

  const getBadge = useCallback(
    (key?: string) => {
      if (key === "requests") return badges.requests;
      if (key === "bugs") return badges.bugs;
      if (key === "notifications") return badges.notifications;
      return 0;
    },
    [badges],
  );

  /** Rail switches submenu and navigates to that section when not already on a page in it. */
  const handleRailSelect = useCallback(
    (section: NavSection) => {
      setActiveGroup(section.label);
      if (isPathInSection(location, section)) return;
      const href = getSectionDefaultHref(section);
      if (href) setLocation(href);
    },
    [location, setLocation],
  );

  if (!user) return null;

  const isProfileActive = isNavActive(location, "/profile");

  return (
    <LayoutGroup>
      <aside className="flex h-screen shrink-0 shadow-xl shadow-black/5">
        {/* Icon rail */}
        <div className="flex w-[76px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border">
            <Link href={homeHref} title={BRAND.shortName} className="block px-1.5">
              <motion.div
                className="flex h-11 w-full items-center justify-center px-1"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
              >
                <AppLogo size="sm" className="mx-auto max-w-full object-center" />
              </motion.div>
            </Link>
          </div>

          <nav className="dialog-scroll flex flex-1 flex-col gap-1 overflow-y-auto py-2">
            {sections.map((section) => {
              const isActive = activeGroup === section.label;
              const Icon = section.icon;
              const hasBadge = section.items.some((i) => getBadge(i.badgeKey) > 0);

              return (
                <button
                  key={section.label}
                  type="button"
                  onClick={() => handleRailSelect(section)}
                  title={section.label}
                  className={cn(
                    "relative mx-1.5 flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[9px] font-bold uppercase tracking-wide transition-colors duration-200",
                    isActive
                      ? "text-sidebar-primary-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-rail-active"
                      className="absolute inset-0 rounded-lg bg-sidebar-primary shadow-md"
                      transition={spring}
                    />
                  )}
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  </span>
                  <span className="relative z-10 max-w-full truncate leading-tight">
                    {section.railLabel}
                  </span>
                  {hasBadge && !isActive && (
                    <span className="absolute right-1.5 top-1.5 z-10 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-sidebar" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-sidebar-border p-2">
            <Link
              href="/profile"
              title="Profile"
              onClick={() => {
                const account = sections.find((s) => s.label === "Account");
                if (account) setActiveGroup(account.label);
              }}
              className={cn(
                "relative flex flex-col items-center rounded-lg py-2 transition-colors",
                isProfileActive ? "text-sidebar-primary-foreground" : "text-muted-foreground",
              )}
            >
              {isProfileActive && (
                <motion.span
                  layoutId="sidebar-rail-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-primary"
                  transition={spring}
                />
              )}
              <Avatar className="relative z-10 h-8 w-8 border border-sidebar-border">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        {/* Submenu panel */}
        {!collapsed && (
        <motion.div className="flex w-[228px] shrink-0 flex-col bg-sidebar-primary text-sidebar-primary-foreground">
          <div className="shrink-0 px-5 pt-6 pb-2">
            <motion.h2
              key={activeSection?.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-bold tracking-tight"
            >
              {activeSection?.label}
            </motion.h2>
            <div className="mt-3 h-px bg-gradient-to-r from-sidebar-primary-foreground/40 via-sidebar-primary-foreground/20 to-transparent" />
          </div>

          <nav className="dialog-scroll flex-1 overflow-y-auto px-2 py-2">
            <motion.ul
              key={activeSection?.label}
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.04 } },
              }}
              className="space-y-0.5"
            >
              {activeSection?.items.map((item) => (
                <motion.li
                  key={item.href}
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    show: { opacity: 1, x: 0 },
                  }}
                >
                  <SidebarNavLink
                    href={item.href}
                    active={isNavActive(location, item.href)}
                    count={getBadge(item.badgeKey)}
                  >
                    {item.title}
                  </SidebarNavLink>
                </motion.li>
              ))}
            </motion.ul>
          </nav>

          <div className="shrink-0 border-t border-sidebar-primary-foreground/20 bg-black/5 px-4 py-3 backdrop-blur-sm">
            <p className="truncate text-xs font-semibold">{user.name}</p>
            <p className="truncate text-[10px] capitalize opacity-60">{role.replace("_", " ")}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              className="mt-2 h-8 w-full justify-start gap-2 px-2 text-[10px] font-bold uppercase tracking-wide opacity-70 hover:bg-sidebar-primary-foreground/10 hover:opacity-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </motion.div>
        )}
      </aside>
    </LayoutGroup>
  );
});
