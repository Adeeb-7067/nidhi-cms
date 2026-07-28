import { useCallback, useState } from "react";

const STORAGE_KEY = "ca.workingDateRange";

export type CaDateRangeKey = "jun" | "prev" | "q1" | "fy" | "ytd";

function readStored(): CaDateRangeKey {
  if (typeof window === "undefined") return "jun";
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === "jun" || v === "prev" || v === "q1" || v === "fy" || v === "ytd") return v;
  } catch {
    /* ignore */
  }
  return "jun";
}

/** Shared CA working period across pages (session-scoped). */
export function useCaWorkingPeriod(initial?: CaDateRangeKey) {
  const [dateRange, setDateRangeState] = useState<CaDateRangeKey>(() => initial ?? readStored());

  const setDateRange = useCallback((v: string) => {
    const next = (v as CaDateRangeKey) || "jun";
    setDateRangeState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { dateRange, setDateRange };
}
