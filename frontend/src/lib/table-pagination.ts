import { useCallback, useEffect, useMemo, useState } from "react";

export const DEFAULT_TABLE_PAGE_SIZE = 12;

export type TablePaginationProps = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function getPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / limit));
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(safePage * limit, total);
  return { totalPages, safePage, start, end };
}

export function useTablePagination(limit = DEFAULT_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const resetPage = useCallback(() => setPage(1), []);
  return { page, setPage, resetPage, limit };
}

/** Client-side paging for lists loaded in full (reports, project detail tables, etc.) */
export function useClientPagination<T>(items: T[], limit = DEFAULT_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const { totalPages, safePage } = getPaginationMeta(total, page, limit);

  useEffect(() => {
    setPage(1);
  }, [items.length, limit]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * limit;
    return items.slice(start, start + limit);
  }, [items, safePage, limit]);

  const pagination: TablePaginationProps = {
    page: safePage,
    total,
    limit,
    onPageChange: setPage,
  };

  return { pageItems, pagination, setPage };
}
