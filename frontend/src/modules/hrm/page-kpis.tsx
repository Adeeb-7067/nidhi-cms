import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, Home, UserCheck, Users } from "lucide-react";
import { useHrmDashboard } from "@/api/hrm";
import { HrmKpiGrid, type HrmKpiItem } from "./components";

export function countByStatus<T extends { status: string }>(rows: T[], status: string) {
  return rows.filter((r) => r.status === status).length;
}

export function HrmPageKpiRow({
  items,
  loading,
  columns = 4,
}: {
  items: HrmKpiItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <HrmKpiGrid
      items={items}
      loading={loading}
      columns={columns}
      count={Math.max(items.length, columns)}
    />
  );
}

/** Org-wide KPI strip from dashboard — for pages without list data yet. */
export function useHrmOrgKpiItems(): { items: HrmKpiItem[]; loading: boolean } {
  const { data, isLoading } = useHrmDashboard();
  const items = useMemo((): HrmKpiItem[] => {
    const stats = data?.stats;
    if (!stats) return [];
    return [
      { label: "Total employees", value: stats.headcount ?? 0, hint: "Active directory", icon: Users, accent: "violet" as const, href: "/hrm/employees" },
      { label: "Present today", value: stats.presentToday ?? 0, hint: "Clocked in or marked", icon: UserCheck, accent: "green" as const, href: "/hrm/attendance" },
      { label: "Pending leave", value: stats.pendingLeave ?? 0, hint: "Awaiting approval", icon: CalendarClock, accent: "blue" as const, href: "/hrm/leave" },
      { label: "Pending WFH", value: stats.pendingWfh ?? 0, hint: "Remote requests", icon: Home, accent: "amber" as const, href: "/hrm/wfh" },
    ];
  }, [data?.stats]);
  return { items, loading: isLoading };
}

export function HrmOrgKpiRow({ columns = 4 }: { columns?: 2 | 3 | 4 }) {
  const { items, loading } = useHrmOrgKpiItems();
  return <HrmPageKpiRow items={items} loading={loading} columns={columns} />;
}

export type { HrmKpiItem, LucideIcon };
