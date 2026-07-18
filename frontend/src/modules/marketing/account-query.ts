import { useCallback, useState } from "react";

/** Read `?account=` from the current URL (Digital project deep links). */
export function getAccountQueryParam(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("account") ?? "";
}

/** Keep the Digital project filter in sync with `?account=` for shareable deep links. */
export function useAccountProjectFilter() {
  const [projectFilter, setProjectFilterState] = useState(() => getAccountQueryParam());

  const setProjectFilter = useCallback((value: string) => {
    setProjectFilterState(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("account", value);
    else url.searchParams.delete("account");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  }, []);

  return [projectFilter, setProjectFilter] as const;
}
