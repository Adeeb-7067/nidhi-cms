import { useEffect, useState } from "react";

/** Simulates brief loading for mock-data pages (demo UX). */
export function useMockPageState(delay = 350) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => setLoading(false), delay);
  };

  return { loading, error, setError, retry };
}
