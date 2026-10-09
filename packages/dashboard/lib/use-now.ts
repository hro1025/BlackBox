"use client";

import { useEffect, useState } from "react";

export function useNow(intervalMs: number): number {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const tick = (): void => {
      setNowMs(Date.now());
    };

    tick();
    const timer = setInterval(tick, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);

  return nowMs;
}
