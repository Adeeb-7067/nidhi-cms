import { useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Activity, Hash, Users, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PageTableSkeleton } from "@/components/loading";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
} from "@/components/layout/portal-page-kit";
import { CmsFilterBar } from "@/components/cms";
import { useCmsActivity, type CmsActivityItem } from "@/api/cms-activity";
import { formatStaffRoleLabel } from "@/lib/user-roles";
import { TABLE_PAGE_SIZE_OPTIONS } from "@/lib/table-pagination";

const ENTITY_FILTERS = [
  { value: "all", label: "All areas" },
  { value: "projects", label: "Projects" },
  { value: "clients", label: "Companies" },
  { value: "users", label: "Users" },
  { value: "bugs", label: "Bugs" },
  { value: "tickets", label: "Tickets" },
  { value: "logs", label: "Daily logs" },
  { value: "tasks", label: "Tasks" },
  { value: "marketing", label: "Digital" },
  { value: "sales", label: "Sales" },
  { value: "finance", label: "Finance" },
  { value: "hrm", label: "HRM" },
  { value: "auth", label: "Sign-in" },
] as const;

export default function AdminActivityPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [entityType, setEntityType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(entityType !== "all" ? { entityType } : {}),
      ...(q ? { q } : {}),
    }),
    [page, limit, entityType, q],
  );

  const { data, isLoading, isFetching } = useCmsActivity(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const uniqueUsers = useMemo(
    () => new Set(items.map((i) => i.actorId).filter(Boolean)).size,
    [items],
  );
  const uniqueAreas = useMemo(() => new Set(items.map((i) => i.entityType)).size, [items]);

  const columns = useMemo((): Column<CmsActivityItem>[] => {
    return [
      {
        id: "when",
        header: "When",
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="whitespace-nowrap text-xs font-medium text-foreground">
              {formatDistanceToNow(new Date(row.timestamp), { addSuffix: true })}
            </p>
            <p className="whitespace-nowrap text-[10px] text-muted-foreground">
              {format(new Date(row.timestamp), "dd MMM yyyy, HH:mm")}
            </p>
          </div>
        ),
        exportValue: (row) => format(new Date(row.timestamp), "yyyy-MM-dd HH:mm:ss"),
      },
      {
        id: "actor",
        header: "User",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.actorName}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.actorRole ? formatStaffRoleLabel(row.actorRole) : "—"}
            </p>
          </div>
        ),
        exportValue: (row) =>
          `${row.actorName}${row.actorRole ? ` (${formatStaffRoleLabel(row.actorRole)})` : ""}`,
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => (
          <p className="text-sm leading-snug">
            <span className="text-muted-foreground">{row.action}</span>{" "}
            <span className="font-medium text-foreground">{row.entityName}</span>
          </p>
        ),
        exportValue: (row) => `${row.action} ${row.entityName}`,
      },
      {
        id: "area",
        header: "Area",
        cell: (row) => (
          <Badge variant="outline" className="font-mono text-[10px] font-normal">
            {row.entityType}
          </Badge>
        ),
        exportValue: (row) => row.entityType,
      },
    ];
  }, []);

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Activity"
        subtitle="Recent actions by users across the CMS — projects, team, tickets, digital, and more."
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={3}
        count={3}
        items={[
          {
            title: "Matching events",
            value: total,
            icon: Activity,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Unique users",
            value: uniqueUsers,
            hint: "On this page",
            icon: Users,
            accent: "green",
            delay: 1,
          },
          {
            title: "Areas",
            value: uniqueAreas,
            hint: "On this page",
            icon: Hash,
            accent: "violet",
            delay: 2,
          },
        ]}
      />

      <CmsFilterBar
        search={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          setPage(1);
          setQ(v.trim());
        }}
        searchPlaceholder="Search by user name…"
        filters={[
          {
            key: "area",
            value: entityType,
            onChange: (v) => {
              setEntityType(v);
              setPage(1);
            },
            placeholder: "Area",
            icon: Filter,
            options: ENTITY_FILTERS.map((f) => ({ value: f.value, label: f.label })),
          },
        ]}
      >
        {isFetching && !isLoading ? (
          <span className="text-xs text-muted-foreground self-center">Refreshing…</span>
        ) : null}
      </CmsFilterBar>

      {isLoading ? (
        <PageTableSkeleton rows={8} columns={4} showToolbar />
      ) : (
        <AdvancedTable
          data={items}
          columns={columns}
          filename="CmsActivity"
          viewStorageKey="admin-cms-activity"
          pagination={{
            page,
            total,
            limit,
            onPageChange: setPage,
            onLimitChange: (next) => {
              setLimit(next);
              setPage(1);
            },
            pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
          }}
        />
      )}
    </PortalPageShell>
  );
}
