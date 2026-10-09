"use client";

import { SeriesSchema, TimelineSchema } from "@blackbox/shared";
import type { SeriesPoint, TimelineEvent } from "@blackbox/shared";
import { useEffect, useState } from "react";
import {
  describeEvent,
  formatClock,
  formatClockWithSeconds,
  formatDuration,
} from "@/lib/format";

const WINDOW_MS = 60 * 60 * 1000;
const POINTS = 360;
const MAX_GAP_MS = 30000;
const REFRESH_INTERVAL_MS = 5000;
const TICK_STEP_MS = 10 * 60 * 1000;

type Stretch = {
  fromMs: number;
  toMs: number;
};

type StripState = {
  agentId: string;
  fromMs: number;
  toMs: number;
  stretches: Stretch[];
  events: TimelineEvent[];
};

function recordedStretches(points: SeriesPoint[]): Stretch[] {
  const stretches: Stretch[] = [];
  let current: Stretch | undefined;

  for (const point of points) {
    if (current !== undefined && point.atMs - current.toMs <= MAX_GAP_MS) {
      current.toMs = point.atMs;
    } else {
      current = { fromMs: point.atMs, toMs: point.atMs };
      stretches.push(current);
    }
  }

  return stretches;
}

export function RecorderStrip({ agentId }: { agentId: string }) {
  const [strip, setStrip] = useState<StripState | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const toMs = Date.now();
        const fromMs = toMs - WINDOW_MS;
        const id = encodeURIComponent(agentId);
        const [seriesResponse, eventsResponse] = await Promise.all([
          fetch(
            `/api/agents/${id}/series?metric=memory&fromMs=${fromMs}&toMs=${toMs}&points=${POINTS}`,
          ),
          fetch(`/api/agents/${id}/events`),
        ]);
        if (!seriesResponse.ok || !eventsResponse.ok) {
          return;
        }

        const points = SeriesSchema.parse(await seriesResponse.json());
        const events = TimelineSchema.parse(await eventsResponse.json());

        if (!cancelled) {
          setStrip({
            agentId,
            fromMs,
            toMs,
            stretches: recordedStretches(points),
            events: events.filter(
              (event) =>
                event.startedAtMs >= fromMs && event.startedAtMs <= toMs,
            ),
          });
        }
      } catch {
        // The page header already reports a server that is not answering.
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [agentId]);

  const current = strip?.agentId === agentId ? strip : undefined;
  if (current === undefined) {
    return <div className="h-32 rounded-lg border border-line bg-raised" />;
  }

  const { fromMs, toMs, stretches, events } = current;
  const place = (atMs: number): number =>
    ((Math.min(Math.max(atMs, fromMs), toMs) - fromMs) / WINDOW_MS) * 100;
  const recordedMs = stretches.reduce(
    (total, stretch) => total + (stretch.toMs - stretch.fromMs),
    0,
  );
  const ticks: number[] = [];
  for (
    let atMs = Math.ceil(fromMs / TICK_STEP_MS) * TICK_STEP_MS;
    atMs <= toMs;
    atMs += TICK_STEP_MS
  ) {
    ticks.push(atMs);
  }

  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium">The last hour on tape</h2>
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">
            {formatDuration(recordedMs)}
          </span>{" "}
          recorded,{" "}
          <span className="font-semibold text-ink">{events.length}</span>{" "}
          {events.length === 1 ? "event" : "events"}
        </p>
      </div>

      <div className="relative mt-4 h-10 overflow-hidden rounded-md bg-backdrop">
        {stretches.map((stretch) => (
          <div
            key={stretch.fromMs}
            title={`Recorded ${formatClockWithSeconds(stretch.fromMs)} to ${formatClockWithSeconds(stretch.toMs)}`}
            className="absolute inset-y-0 bg-series/35"
            style={{
              left: `${place(stretch.fromMs)}%`,
              width: `${Math.max(place(stretch.toMs) - place(stretch.fromMs), 0.15)}%`,
            }}
          />
        ))}

        {events.map((event) => (
          <div
            key={`${event.source}-${event.kind}-${event.startedAtMs}`}
            title={`${describeEvent(event)}, ${formatClockWithSeconds(event.startedAtMs)}`}
            className="absolute inset-y-0 w-0.5 bg-accent"
            style={{ left: `${place(event.startedAtMs)}%` }}
          />
        ))}
      </div>

      <div className="relative mt-1 h-5 text-xs text-muted">
        {ticks.map((atMs) => (
          <span
            key={atMs}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${place(atMs)}%` }}
          >
            {formatClock(atMs)}
          </span>
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-sm bg-series/35" />
          Recording
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-sm bg-backdrop" />
          Nothing received
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-0.5 bg-accent" />
          Event
        </li>
      </ul>
    </section>
  );
}
