import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListUsers, getListUsersQueryKey, useGetProjectMembers, getGetProjectMembersQueryKey } from "@/api/generated/api";
import type { User } from "@/api/generated/api.schemas";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  value?: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  allowUnassigned?: boolean;
  disabled?: boolean;
  /** When set, only project roster members are listed (preferred for digital assign). */
  projectId?: number | null;
};

/** Assignee picker for Digital forms (Tasks, Graphics, Videos, Content, Posts).
 * Prefer `projectId` so leads assign within the project team only.
 */
export function MarketingAssigneeSelect({
  value,
  onValueChange,
  placeholder = "Select assignee",
  className = "h-8 w-full text-xs",
  allowUnassigned = true,
  disabled = false,
  projectId = null,
}: Props) {
  const scopedProjectId = projectId != null && Number.isFinite(Number(projectId)) ? Number(projectId) : null;
  const staffParams = { staff: "true" as const, limit: 300 };
  const { data, isLoading: usersLoading } = useListUsers(staffParams, {
    query: { queryKey: getListUsersQueryKey(staffParams), staleTime: 5 * 60_000 },
  });
  const { data: members, isLoading: membersLoading } = useGetProjectMembers(scopedProjectId ?? 0, {
    query: {
      enabled: scopedProjectId != null,
      queryKey: getGetProjectMembersQueryKey(scopedProjectId ?? 0),
      staleTime: 60_000,
    },
  });

  const staff = useMemo(() => {
    const users = (data as { users?: User[] } | undefined)?.users ?? [];
    const digitalAssignable = new Set([
      "digital",
      "freelancer",
      "manager",
      "super_admin",
      "hr",
    ]);
    let list = users.filter((u) => u.status === "active" && digitalAssignable.has(u.role ?? ""));
    if (scopedProjectId != null) {
      const memberIds = new Set((members ?? []).map((m) => Number(m.userId)));
      list = list.filter((u) => memberIds.has(Number(u.id)));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, members, scopedProjectId]);

  const isLoading = usersLoading || (scopedProjectId != null && membersLoading);

  if (isLoading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }

  const selectValue = value || (allowUnassigned ? "__none__" : undefined);

  return (
    <Select
      value={selectValue}
      disabled={disabled}
      onValueChange={(v) => onValueChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned && <SelectItem value="__none__">Unassigned</SelectItem>}
        {staff.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function parseAssigneeId(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Craft users always submit as themselves; leads use the picker value. */
export function resolveFormAssigneeId(
  canAssignOthers: boolean,
  raw: string,
  selfUserId: number | string | null | undefined,
): number | null {
  if (!canAssignOthers) {
    return selfUserId != null && Number.isFinite(Number(selfUserId)) ? Number(selfUserId) : null;
  }
  return parseAssigneeId(raw);
}
