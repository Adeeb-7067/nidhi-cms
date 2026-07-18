import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListUsers, getListUsersQueryKey } from "@/api/generated/api";
import type { User } from "@/api/generated/api.schemas";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  value?: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  allowUnassigned?: boolean;
};

/** Staff assignee picker for Digital forms (Tasks, Graphics, Videos, Content, Posts). */
export function MarketingAssigneeSelect({
  value,
  onValueChange,
  placeholder = "Select assignee",
  className = "h-8 w-full text-xs",
  allowUnassigned = true,
}: Props) {
  const staffParams = { staff: "true" as const, limit: 300 };
  const { data, isLoading } = useListUsers(staffParams, {
    query: { queryKey: getListUsersQueryKey(staffParams), staleTime: 5 * 60_000 },
  });

  const staff = useMemo(() => {
    const users = (data as { users?: User[] } | undefined)?.users ?? [];
    return users
      .filter((u) => u.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  if (isLoading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }

  const selectValue = value || (allowUnassigned ? "__none__" : undefined);

  return (
    <Select
      value={selectValue}
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
