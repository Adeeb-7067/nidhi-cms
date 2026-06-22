import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ScrollText, ShieldAlert, Activity, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmFilterRow,
  HrmRefRefreshButton,
  hrmRefCountSubtitle,
} from "@/modules/hrm/components";
import { formatAuditWhen } from "@/modules/hrm/hrm-table-columns";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmAuditLogs } from "@/api/hrm";
import type { HrmAuditLog } from "@/modules/hrm/types";

export default function HrmAuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const { data, isLoading, refetch, isFetching } = useHrmAuditLogs(
    actionFilter.trim() ? { action: actionFilter.trim() } : undefined,
  );

  const logs = data?.logs ?? [];
  const today = format(new Date(), "yyyy-MM-dd");

  const kpiItems = useMemo(() => {
    const todayLogs = logs.filter((l) => l.createdAt?.startsWith(today)).length;
    const critical = logs.filter((l) => l.severity === "critical" || l.severity === "warning").length;
    const actions = new Set(logs.map((l) => l.action)).size;
    return [
      { label: "Total entries", value: logs.length, icon: ScrollText, accent: "blue" as const },
      { label: "Today", value: todayLogs, icon: Activity, accent: "green" as const },
      { label: "Action types", value: actions, icon: Hash, accent: "violet" as const },
      { label: "Warnings+", value: critical, icon: ShieldAlert, accent: "amber" as const },
    ];
  }, [logs, today]);

  const columns = useMemo((): Column<HrmAuditLog>[] => [
    {
      id: "when",
      header: "When",
      cell: (log) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatAuditWhen(log.createdAt)}
        </span>
      ),
      exportValue: (log) => formatAuditWhen(log.createdAt),
    },
    {
      id: "actor",
      header: "Actor",
      cell: (log) => <span className="font-medium">{log.actorName ?? `User #${log.actorId}`}</span>,
      exportValue: (log) => log.actorName ?? String(log.actorId),
    },
    {
      id: "action",
      header: "Action",
      accessorKey: "action",
      cell: (log) => <span className="font-mono text-xs">{log.action}</span>,
    },
    {
      id: "entity",
      header: "Entity",
      cell: (log) => (
        <span className="text-xs text-muted-foreground">
          {log.entityType}
          {log.entityId != null ? ` #${log.entityId}` : ""}
        </span>
      ),
      exportValue: (log) => `${log.entityType}${log.entityId != null ? ` #${log.entityId}` : ""}`,
    },
    {
      id: "severity",
      header: "Severity",
      cell: (log) => (
        <Badge variant={log.severity === "critical" ? "destructive" : "outline"}>
          {log.severity}
        </Badge>
      ),
      exportValue: (log) => log.severity,
    },
  ], []);

  return (
    <HrmGate module="audit">
      <HrmPageShell>
        <HrmPageHero
          title="Audit logs"
          description={
            isLoading
              ? "Loading activity…"
              : `${hrmRefCountSubtitle(logs.length, "event")} · system activity trail`
          }
          actions={<HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />}
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <HrmFilterRow
          search={actionFilter}
          onSearchChange={setActionFilter}
          searchPlaceholder="Filter by action (e.g. leave_approved)"
        />

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={logs}
            columns={columns}
            filename="HrmAuditExport"
            viewStorageKey="hrm-audit"
          />
        </PortalTablePanel>
      </HrmPageShell>
    </HrmGate>
  );
}
