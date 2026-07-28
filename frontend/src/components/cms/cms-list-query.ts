/**
 * Map a react-query result into CmsDataTable loading/error props.
 * Keeps list pages consistent: inline error + retry, no load toast.
 */
export function cmsListQueryProps(query: {
  isLoading: boolean;
  isError: boolean;
  refetch: (...args: unknown[]) => unknown;
}): {
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
} {
  return {
    isLoading: query.isLoading,
    error: query.isError,
    onRetry: () => {
      void query.refetch();
    },
  };
}
