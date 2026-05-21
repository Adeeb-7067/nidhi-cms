import { useCallback, useState } from "react";

export type DataViewMode = "table" | "grid";

export function useDataViewMode(
  storageKey?: string,
  defaultMode: DataViewMode = "table",
): [DataViewMode, (mode: DataViewMode) => void] {
  const [viewMode, setViewMode] = useState<DataViewMode>(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(`cms-data-view:${storageKey}`);
      if (stored === "table" || stored === "grid") return stored;
    }
    return defaultMode;
  });

  const setMode = useCallback(
    (mode: DataViewMode) => {
      setViewMode(mode);
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(`cms-data-view:${storageKey}`, mode);
      }
    },
    [storageKey],
  );

  return [viewMode, setMode];
}
