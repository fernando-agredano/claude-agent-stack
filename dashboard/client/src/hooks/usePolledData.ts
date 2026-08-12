import { useEffect, useState } from "react";

export function usePolledData<T>(url: string, intervalMs: number, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        const res = await fetch(url);
        const json = (await res.json()) as T;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        // se reintenta en el proximo ciclo de polling
      }
    }

    fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url, intervalMs]);

  return { data, loading };
}
