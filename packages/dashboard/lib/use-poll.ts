"use client";

import { useEffect, useState } from "react";

type Parser<T> = {
  parse: (input: unknown) => T;
};

type Loaded<T> = {
  url: string;
  data: T;
  loadedAtMs: number;
};

export type Poll<T> = {
  data: T | undefined;
  loadedAtMs: number;
  error: string | undefined;
};

export function usePoll<T>(
  url: string | undefined,
  schema: Parser<T>,
  intervalMs: number,
): Poll<T> {
  const [loaded, setLoaded] = useState<Loaded<T> | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (url === undefined) {
      return;
    }

    const target = url;
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await fetch(target);
        if (!response.ok) {
          throw new Error(`The server answered ${response.status}`);
        }

        const data = schema.parse(await response.json());
        if (!cancelled) {
          setLoaded({ url: target, data, loadedAtMs: Date.now() });
          setError(undefined);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      }
    }

    void load();
    const timer =
      intervalMs > 0
        ? setInterval(() => {
            void load();
          }, intervalMs)
        : undefined;

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url, schema, intervalMs]);

  const current = loaded?.url === url ? loaded : undefined;

  return {
    data: current?.data,
    loadedAtMs: current?.loadedAtMs ?? 0,
    error,
  };
}
