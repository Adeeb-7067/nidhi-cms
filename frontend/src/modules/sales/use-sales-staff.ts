import { useMemo } from "react";
import { useListUsers, getListUsersQueryKey } from "@/api/generated/api";
import type { User } from "@/api/generated/api.schemas";

export function useSalesStaff() {
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
  return { staff, isLoading };
}
