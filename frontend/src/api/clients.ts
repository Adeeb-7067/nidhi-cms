import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { getListClientsQueryKey } from "./generated/api";

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      customFetch(apiUrl(`/clients/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
    },
  });
}
