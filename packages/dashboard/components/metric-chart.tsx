"use client";

import { breakAtGaps, SeriesSchema } from "@blackbox/shared";
import type { ChartPoint, Metric } from "@blackbox/shared";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  axisTicks,
  formatAxis,
  formatClock,
  formatClockWithSeconds,
  formatMetric,
  METRIC_TITLE,
} from "@/lib/format";
import { subscribeLive } from "@/lib/live";

const POINTS = 300;
const MIN_GAP_MS = 15000;
const RESYNC_INTERVAL_MS = 30000;
const MINUTE_MS = 60 * 1000;
const TICK_STEPS_MS = [
  MINUTE_MS,
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  60 * MINUTE_MS,
  240 * MINUTE_MS,
];

export type TimeWindow =
  | { type: "live"; lengthMs: number }
  | { type: "fixed"; fromMs: number; toMs: number };

type ChartState = {
  key: string;
  fromMs: number;
  toMs: number;
  points: ChartPoint[];
};

function windowKey(
  agentId: string,
  metric: Metric,
  window: TimeWindow,
): string {
  return window.type === "live"
    ? `${agentId}|${metric}|live|${window.lengthMs}`
    : `${agentId}|${metric}|fixed|${window.fromMs}|${window.toMs}`;
}

function clockTicks(fromMs: number, toMs: number): number[] {
  const stepMs =
    TICK_STEPS_MS.find((step) => (toMs - fromMs) / step <= 7) ??
    240 * MINUTE_MS;
  const ticks: number[] = [];

  for (
    let atMs = Math.ceil(fromMs / stepMs) * stepMs;
    atMs <= toMs;
    atMs += stepMs
  ) {
    ticks.push(atMs);
  }

  return ticks;
}

function lastValue(points: ChartPoint[]): number | undefined {
  return points.findLast((point) => point.value !== undefined)?.value;
}

function highestValue(points: ChartPoint[]): number | undefined {
  let highest: number | undefined;

  for (const point of points) {
    if (
      point.value !== undefined &&
      (highest === undefined || point.value > highest)
    ) {
      highest = point.value;
    }
  }

  return highest;
}

export function MetricChart({
  agentId,
  metric,
  window,
  markAtMs,
}: {
  agentId: string;
  metric: Metric;
  window: TimeWindow;
  markAtMs?: number;
}) {
  const [chart, setChart] = useState<ChartState | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const key = windowKey(agentId, metric, window);
  const isLive = window.type === "live";
  const lengthMs = isLive ? window.lengthMs : 0;
  const fixedFromMs = isLive ? 0 : window.fromMs;
  const fixedToMs = isLive ? 0 : window.toMs;

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const toMs = isLive ? Date.now() : fixedToMs;
        const fromMs = isLive ? toMs - lengthMs : fixedFromMs;
        const response = await fetch(
          `/api/agents/${encodeURIComponent(agentId)}/series?metric=${metric}&fromMs=${fromMs}&toMs=${toMs}&points=${POINTS}`,
        );
        if (!response.ok) {
          throw new Error(`The server answered ${response.status}`);
        }

        const series = SeriesSchema.parse(await response.json());
        const maxGapMs = Math.max(MIN_GAP_MS, (3 * (toMs - fromMs)) / POINTS);

        if (!cancelled) {
          setChart({
            key,
            fromMs,
            toMs,
            points: breakAtGaps(series, maxGapMs),
          });
          setError(undefined);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      }
    }

    void load();
    const timer = isLive
      ? setInterval(() => {
          void load();
        }, RESYNC_INTERVAL_MS)
      : undefined;

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [agentId, metric, key, isLive, lengthMs, fixedFromMs, fixedToMs]);

  useEffect(() => {
    if (!isLive) {
      return;
    }

    return subscribeLive(agentId, (point) => {
      if (point.metric !== metric) {
        return;
      }

      setChart((previous) => {
        const last = previous?.points.at(-1);
        if (
          previous === undefined ||
          previous.key !== key ||
          (last !== undefined && point.atMs <= last.atMs)
        ) {
          return previous;
        }

        const toMs = Math.max(previous.toMs, point.atMs);
        const fromMs = toMs - lengthMs;
        const maxGapMs = Math.max(MIN_GAP_MS, (3 * lengthMs) / POINTS);
        const points = previous.points.filter((kept) => kept.atMs >= fromMs);

        if (last !== undefined && point.atMs - last.atMs > maxGapMs) {
          points.push({ atMs: last.atMs + 1, value: undefined });
        }
        points.push({ atMs: point.atMs, value: point.value });

        return { key, fromMs, toMs, points };
      });
    });
  }, [agentId, metric, key, isLive, lengthMs]);

  const current = chart?.key === key ? chart : undefined;
  const headline =
    current === undefined
      ? undefined
      : isLive
        ? lastValue(current.points)
        : highestValue(current.points);
  const usesPercent = metric === "memory" || metric === "cpu";
  const valueTicks = usesPercent
    ? [0, 25, 50, 75, 100]
    : axisTicks(
        current === undefined ? 0 : (highestValue(current.points) ?? 0),
      );
  const valueTop = valueTicks.at(-1) ?? 1;

  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium">{METRIC_TITLE[metric]}</h3>
        {headline !== undefined && (
          <p className="text-sm text-muted">
            {isLive ? "now" : "peak"}{" "}
            <span className="font-semibold text-ink">
              {formatMetric(metric, headline)}
            </span>
          </p>
        )}
      </div>

      <div className="mt-3 h-44">
        {error !== undefined && (
          <p className="text-sm text-muted">Could not load this: {error}</p>
        )}

        {error === undefined && current === undefined && (
          <p className="text-sm text-muted">Loading...</p>
        )}

        {error === undefined &&
          current !== undefined &&
          current.points.length === 0 && (
            <p className="text-sm text-muted">
              Nothing was recorded in this time span.
            </p>
          )}

        {error === undefined &&
          current !== undefined &&
          current.points.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={current.points}
                margin={{ top: 6, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="atMs"
                  type="number"
                  scale="time"
                  domain={[current.fromMs, current.toMs]}
                  ticks={clockTicks(current.fromMs, current.toMs)}
                  tickFormatter={formatClock}
                  stroke="var(--line)"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, valueTop]}
                  ticks={valueTicks}
                  tickFormatter={(value: number) => formatAxis(metric, value)}
                  width={metric === "network" ? 64 : 48}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      | ChartPoint
                      | undefined;
                    if (!active || point?.value === undefined) {
                      return null;
                    }

                    return (
                      <div className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
                        <div className="font-semibold">
                          {formatMetric(metric, point.value)}
                        </div>
                        <div className="text-muted">
                          {formatClockWithSeconds(point.atMs)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  dataKey="value"
                  type="linear"
                  stroke="var(--series)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="var(--series)"
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "var(--series)",
                    stroke: "var(--raised)",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {markAtMs !== undefined && (
                  <ReferenceLine
                    x={markAtMs}
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>
    </section>
  );
}
