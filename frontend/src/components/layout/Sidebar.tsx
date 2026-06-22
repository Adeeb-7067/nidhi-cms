import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, LayoutGroup } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useListRequests,
  useListBugs,
  getListRequestsQueryKey,
  getListBugsQueryKey,
} from "@/api";
import { useRealtime } from "@/contexts/RealtimeContext";
import { QUERY_STALE } from "@/lib/query-config";
import {
  getNavSections,
  getHomeHref,
  isNavActive,
  findActiveNavGroupLabel,
  getSectionDefaultHref,
  isPathInSection,
  navigateNavHref,
  syncSettingsSectionFromNavHref,
  type UserRole,
  type NavSection,
  type NavItem,
  isDevPortalRole,
} from "@/lib/navigation";
import { usePermissions } from "@/modules/permissions/usePermission";
import { useClientTeam } from "@/contexts/ClientTeamContext";

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
        enabled: isDevPortalRole(role),
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

type SidebarNavLinkProps = {
  href: string;
  active: boolean;
  title: string;
  icon: LucideIcon;
  count?: number;
};

function SidebarNavLink({
  href,
  active,
  title,
  icon: Icon,
  count,
  onNavigate,
}: SidebarNavLinkProps & { onNavigate?: (href: string) => void }) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.(href)}
      className="block outline-none"
    >
      <motion.div
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium leading-tight",
          active
            ? "bg-sidebar-primary-foreground/16 text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-primary-foreground/75 hover:bg-sidebar-primary-foreground/10 hover:text-sidebar-primary-foreground",
        )}
        whileTap={{ scale: 0.99 }}
        transition={spring}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-bar"
            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-sidebar-primary-foreground"
            transition={spring}
          />
        )}
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
            active
              ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
              : "bg-sidebar-primary-foreground/8 text-sidebar-primary-foreground/80 group-hover:bg-sidebar-primary-foreground/12",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {count != null && count > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
              active ? "bg-sidebar-primary-foreground/25" : "bg-destructive text-destructive-foreground",
            )}
          >
            {count > 99 ? "99+" : count > 9 ? "9+" : count}
          </span>
        )}
      </motion.div>
    </Link>
  );
}

function SidebarGroupLabel({ label }: { label: string }) {
  return (
    <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary-foreground/45 first:pt-1">
      {label}
    </p>
  );
}

function groupNavItems(items: NavItem[]): Array<{ group?: string; items: NavItem[] }> {
  const hasGroups = items.some((item) => item.group);
  if (!hasGroups) return [{ items }];

  const buckets: Array<{ group?: string; items: NavItem[] }> = [];
  for (const item of items) {
    const last = buckets[buckets.length - 1];
    if (last && last.group === item.group) {
      last.items.push(item);
    } else {
      buckets.push({ group: item.group, items: [item] });
    }
  }
  return buckets;
}

type SidebarProps = {
  collapsed?: boolean;
  className?: string;
};

function useSidebarNavState() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const team = useClientTeam();
  const badges = useBadgeCounts((user?.role ?? "developer") as UserRole);

  const role = user?.role as UserRole;
  const { canViewHref } = usePermissions();
  const rawSections = user ? getNavSections(role) : [];

  const sections = useMemo<NavSection[]>(() => {
    const permissionFiltered = rawSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (role === "client") {
            return item.roles.includes(role) && canViewHref(item.href);
          }
          return canViewHref(item.href);
        }),
      }))
      .filter((section) => section.items.length > 0);

    if (role !== "client" || !team.isClientUser || team.isAdmin) return permissionFiltered;
    return permissionFiltered
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.href === "/client/team") return false;
          if (item.href === "/client/team/activity") return false;
          if (item.href === "/client/analytics") return team.can("reports");
          if (item.href === "/client/apk") return team.can("documents");
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
    // We rely on `team` and the role to recompute whenever permissions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, team.isClientUser, team.isAdmin, team.permissions, rawSections.length, canViewHref]);

  const homeHref = user ? getHomeHref(role) : "/login";

  const [activeGroup, setActiveGroup] = useState(() =>
    sections.length ? (findActiveNavGroupLabel(sections, location) ?? sections[0].label) : "",
  );

  useEffect(() => {
    const label = findActiveNavGroupLabel(sections, location);
    if (label) setActiveGroup(label);
  }, [location, sections]);

  const activeSection = sections.find((s) => s.label === activeGroup) ?? sections[0];

  const groupedItems = useMemo(
    () => (activeSection ? groupNavItems(activeSection.items) : []),
    [activeSection],
  );

  const getBadge = useCallback(
    (key?: string) => {
      if (key === "requests") return badges.requests;
      if (key === "bugs") return badges.bugs;
      if (key === "notifications") return badges.notifications;
      return 0;
    },
    [badges],
  );

  const handleRailSelect = useCallback(
    (section: NavSection) => {
      setActiveGroup(section.label);
      if (isPathInSection(location, section)) return;
      const href = getSectionDefaultHref(section);
      if (href) navigateNavHref(href, setLocation);
    },
    [location, setLocation],
  );

  const handleNavItemClick = useCallback((href: string) => {
    syncSettingsSectionFromNavHref(href);
  }, []);

  return {
    user,
    logout,
    role,
    sections,
    homeHref,
    location,
    activeGroup,
    activeSection,
    groupedItems,
    getBadge,
    handleRailSelect,
    handleNavItemClick,
    setActiveGroup,
  };
}

export const Sidebar = memo(function Sidebar({ collapsed = false, className }: SidebarProps) {
  const {
    user,
    logout,
    role,
    sections,
    homeHref,
    location,
    activeGroup,
    activeSection,
    groupedItems,
    getBadge,
    handleRailSelect,
    handleNavItemClick,
    setActiveGroup,
  } = useSidebarNavState();

  if (!user) return null;

  const isProfileActive = isNavActive(location, "/profile");
  const accountSection = sections.find((s) => s.label === "Account");

  return (
    <LayoutGroup>
      <aside className={cn("flex h-dvh shrink-0 shadow-xl shadow-black/5", className)}>
        {/* Icon rail */}
        <div className="flex w-[72px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border px-2">
            <Link href={homeHref} title={BRAND.shortName} className="block w-full">
              <motion.div
                className="flex h-10 w-full items-center justify-center"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
              >
                <AppLogo size="sm" className="mx-auto" />
              </motion.div>
            </Link>
          </div>

          <nav className="sidebar-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-2">
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
                    "relative flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[9px] font-semibold leading-none transition-colors duration-200",
                    isActive
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
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
                  <span className="relative z-10 max-w-full truncate px-0.5 text-center">
                    {section.railLabel}
                  </span>
                  {hasBadge && !isActive && (
                    <span className="absolute right-1 top-1.5 z-10 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-sidebar" />
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
                if (accountSection) setActiveGroup(accountSection.label);
              }}
              className={cn(
                "relative flex flex-col items-center rounded-lg py-2 transition-colors",
                isProfileActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
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
        {!collapsed && activeSection && (
          <motion.div className="flex w-[240px] shrink-0 flex-col bg-sidebar-primary text-sidebar-primary-foreground">
            <div className="shrink-0 border-b border-sidebar-primary-foreground/10 px-4 pb-4 pt-5">
              <motion.h2
                key={activeSection.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-bold tracking-tight"
              >
                {activeSection.label}
              </motion.h2>
              <p className="mt-1 text-xs text-sidebar-primary-foreground/55">
                {activeSection.items.length} {activeSection.items.length === 1 ? "page" : "pages"}
              </p>
            </div>

            <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3">
              <motion.div
                key={activeSection.label}
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
                }}
                className="space-y-0.5"
              >
                {groupedItems.map((bucket, bucketIndex) => (
                  <div key={`${activeSection.label}-${bucket.group ?? "default"}-${bucketIndex}`}>
                    {bucket.group ? <SidebarGroupLabel label={bucket.group} /> : null}
                    <ul className="space-y-0.5">
                      {bucket.items.map((item) => (
                        <motion.li
                          key={item.href}
                          variants={{
                            hidden: { opacity: 0, x: -6 },
                            show: { opacity: 1, x: 0 },
                          }}
                        >
                          <SidebarNavLink
                            href={item.href}
                            active={isNavActive(location, item.href)}
                            title={item.title}
                            icon={item.icon}
                            count={getBadge(item.badgeKey)}
                            onNavigate={handleNavItemClick}
                          />
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            </nav>

            <div className="shrink-0 border-t border-sidebar-primary-foreground/15 bg-black/5 px-3 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-lg px-1 py-1">
                <Avatar className="h-9 w-9 shrink-0 border border-sidebar-primary-foreground/20">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-sidebar-primary-foreground/15 text-[11px] font-bold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
                  <p className="truncate text-[11px] capitalize text-sidebar-primary-foreground/55">
                    {role.replace("_", " ")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void logout()}
                className="mt-2 h-9 w-full justify-start gap-2.5 rounded-lg px-2.5 text-xs font-medium text-sidebar-primary-foreground/70 hover:bg-sidebar-primary-foreground/10 hover:text-sidebar-primary-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </Button>
            </div>
          </motion.div>
        )}
      </aside>
    </LayoutGroup>
  );
});

type MobileNavSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const {
    user,
    logout,
    role,
    sections,
    homeHref,
    location,
    getBadge,
  } = useSidebarNavState();

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 sm:max-w-xs">
        <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
          <div className="flex items-center gap-3">
            <AppLogo size="sm" />
            <SheetTitle className="text-base">{BRAND.shortName}</SheetTitle>
          </div>
        </SheetHeader>

        <nav className="dialog-scroll flex-1 overflow-y-auto px-3 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4 last:mb-0">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        syncSettingsSectionFromNavHref(item.href);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium",
                        isNavActive(location, item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-muted/60",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {getBadge(item.badgeKey) > 0 ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {getBadge(item.badgeKey) > 99 ? "99+" : getBadge(item.badgeKey)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border/60 px-3 py-3">
          <Link
            href="/profile"
            onClick={() => onOpenChange(false)}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
          >
            <Avatar className="h-9 w-9 border border-border/60">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {role.replace("_", " ")}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              void logout();
            }}
            className="mt-2 h-10 w-full justify-start gap-2.5 px-2.5 text-sm"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </Button>
          <Link href={homeHref} onClick={() => onOpenChange(false)} className="sr-only">
            Home
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
