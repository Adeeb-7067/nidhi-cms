import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export function deleteLog(id: number): Promise<{ message: string; id: number }> {
  return customFetch<{ message: string; id: number }>(apiUrl(`/api/logs/${id}`), {
    method: "DELETE",
  });
}

export function useDeleteLog() {
  return useMutation({
    mutationFn: (id: number) => deleteLog(id),
  });
}
