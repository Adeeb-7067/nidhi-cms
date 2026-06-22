import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toastApiError } from "@/lib/api-error";

export type HrmApiMeta = {
  /** Fallback when the API body has no message. */
  errorMessage?: string;
  /** Default true for mutations, false for queries. */
  showErrorToast?: boolean;
  hrmApi?: boolean;
};

export function useHrmMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    meta?: HrmApiMeta;
  },
) {
  const { onError, meta, ...rest } = options;
  const showErrorToast = meta?.showErrorToast ?? true;
  const errorMessage = meta?.errorMessage;

  return useMutation({
    ...rest,
    meta: { hrmApi: true, ...meta },
    onError: (...args) => {
      if (showErrorToast) {
        toastApiError(args[0], errorMessage);
      }
      onError?.(...args);
    },
  });
}

export function useHrmQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    meta?: HrmApiMeta;
  },
) {
  const { meta, ...rest } = options;
  return useQuery({
    ...rest,
    meta: { hrmApi: true, showErrorToast: false, ...meta },
  });
}

type HrmQuerySlice = {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  refetch?: () => void;
};

/** Merge loading/error from multiple HRM queries (e.g. list + history tabs). */
export function mergeHrmQueryStates(...queries: HrmQuerySlice[]) {
  const failed = queries.find((q) => q.isError);
  return {
    isLoading: queries.some((q) => q.isLoading),
    isError: Boolean(failed),
    error: failed?.error,
    refetch: () => {
      for (const q of queries) q.refetch?.();
    },
  };
}
