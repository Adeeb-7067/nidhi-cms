import { useCallback, useEffect, useMemo, useState } from "react";

/** Rows-per-page choices shown in table pagination dropdowns. */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

/** Sentinel stored in state when the user chooses “All” in the rows dropdown. */
export const PAGE_SIZE_ALL = -1;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export type PageLimit = TablePageSize | typeof PAGE_SIZE_ALL;

export const DEFAULT_TABLE_PAGE_SIZE: TablePageSize = 10;

/** Max rows the API will return for a single “show all” request. */
export const API_PAGE_LIMIT_CAP = 1000;

export const PAGE_SIZE_ALL_SELECT_VALUE = "all";

export type TablePaginationProps = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
};

export function isShowAllPageSize(limit: number): boolean {
  return limit === PAGE_SIZE_ALL;
}

export function normalizePageLimit(value: number): PageLimit {
  if (value === PAGE_SIZE_ALL) return PAGE_SIZE_ALL;
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_TABLE_PAGE_SIZE;
  }
  if ((TABLE_PAGE_SIZE_OPTIONS as readonly number[]).includes(value)) {
    return value as TablePageSize;
  }
  return DEFAULT_TABLE_PAGE_SIZE;
}

/** @deprecated Use normalizePageLimit */
export function normalizePageSize(value: number): TablePageSize {
  const n = normalizePageLimit(value);
  return n === PAGE_SIZE_ALL ? DEFAULT_TABLE_PAGE_SIZE : n;
}

/** Effective row count for slicing / pagination math (client-side or display). */
export function effectivePageSize(limit: number, total: number): number {
  if (isShowAllPageSize(limit)) return Math.max(total, 1);
  return normalizePageLimit(limit) as number;
}

/** Limit to send to list APIs (caps “all” at API_PAGE_LIMIT_CAP). */
export function resolveApiPageLimit(limit: number, knownTotal?: number): number {
  if (isShowAllPageSize(limit)) {
    if (knownTotal != null && knownTotal > 0) {
      return Math.min(knownTotal, API_PAGE_LIMIT_CAP);
    }
    return API_PAGE_LIMIT_CAP;
  }
  return normalizePageLimit(limit) as number;
}

export function getPaginationMeta(
  total: number,
  page: number,
  limit: number,
  loadedRowCount?: number,
) {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const displayTotal =
    isShowAllPageSize(limit) && loadedRowCount != null && loadedRowCount >= 0
      ? Math.min(safeTotal, loadedRowCount)
      : safeTotal;
  const safeLimit = effectivePageSize(limit, displayTotal);
  const safePageNum = Number.isFinite(page) && page > 0 ? page : 1;
  const totalPages =
    displayTotal === 0 ? 0 : Math.max(1, Math.ceil(displayTotal / safeLimit));
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(1, safePageNum), totalPages);
  const start = displayTotal === 0 ? 0 : (safePage - 1) * safeLimit + 1;
  const end = displayTotal === 0 ? 0 : Math.min(safePage * safeLimit, displayTotal);
  return { totalPages, safePage, start, end, safeLimit };
}

export function useTablePagination(initialLimit: number = DEFAULT_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(() => normalizePageLimit(initialLimit));

  const apiLimit = useMemo(() => resolveApiPageLimit(limit), [limit]);

  const resetPage = useCallback(() => setPage(1), []);

  const setLimit = useCallback((next: number) => {
    setLimitState(normalizePageLimit(next));
    setPage(1);
  }, []);

  return { page, setPage, resetPage, limit, apiLimit, setLimit };
}

export type SharedPaginationLimit = {
  limit: number;
  setLimit: (limit: number) => void;
};

/** Client-side paging for lists loaded in full (reports, project detail tables, etc.) */
export function useClientPagination<T>(
  items: T[],
  sharedLimit?: number | SharedPaginationLimit,
) {
  const sharedSetLimit =
    sharedLimit != null && typeof sharedLimit === "object"
      ? sharedLimit.setLimit
      : undefined;
  const sharedLimitValue =
    sharedLimit != null && typeof sharedLimit === "object"
      ? sharedLimit.limit
      : undefined;

  const [page, setPage] = useState(1);
  const [ownLimit, setOwnLimit] = useState(() =>
    normalizePageLimit(
      typeof sharedLimit === "number" ? sharedLimit : DEFAULT_TABLE_PAGE_SIZE,
    ),
  );

  const limit =
    sharedLimitValue != null ? normalizePageLimit(sharedLimitValue) : ownLimit;
  const total = items.length;
  const { totalPages, safePage } = getPaginationMeta(total, page, limit, items.length);

  const setLimit = useCallback(
    (next: number) => {
      const normalized = normalizePageLimit(next);
      if (sharedSetLimit) {
        sharedSetLimit(normalized);
      } else {
        setOwnLimit(normalized);
      }
      setPage(1);
    },
    [sharedSetLimit],
  );

  useEffect(() => {
    setPage(1);
  }, [items.length, limit]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const pageSize = effectivePageSize(limit, items.length);
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, limit]);

  const pagination: TablePaginationProps = useMemo(
    () => ({
      page: safePage,
      total,
      limit,
      onPageChange: setPage,
      onLimitChange: setLimit,
    }),
    [safePage, total, limit, setLimit],
  );

  return { pageItems, pagination, setPage, setLimit };
}
