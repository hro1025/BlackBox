import type { Metric, TimelineEvent } from "@blackbox/shared";

export const ONLINE_WITHIN_MS = 15000;

export const METRIC_TITLE: Record<Metric, string> = {
  memory: "Memory",
  cpu: "CPU",
  load: "Load",
  network: "Network",
  temperature: "Temperature",
};

const LIFECYCLE_TITLE: Record<string, string> = {
  "agent-crashed": "Agent crashed",
  "clean-restart": "Agent restarted",
  "clean-reboot": "Machine rebooted",
  "unclean-reboot": "Machine went down without warning",
};

const RULE_TITLE: Record<string, string> = {
  "memory-high": "Memory stayed high",
  silence: "Agent went silent",
  "clock-skew": "Clock ahead of the server",
};

export function formatClock(atMs: number): string {
  return new Date(atMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function formatClockWithSeconds(atMs: number): string {
  return new Date(atMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function formatDateTime(atMs: number): string {
  const day = new Date(atMs).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

  return `${day}, ${formatClockWithSeconds(atMs)}`;
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  if (minutes > 0) {
    return `${minutes} min ${seconds} s`;
  }
  return `${seconds} s`;
}

export function formatMetric(metric: Metric, value: number): string {
  switch (metric) {
    case "memory":
    case "cpu":
      return `${value.toFixed(1)}%`;
    case "load":
      return value.toFixed(2);
    case "temperature":
      return `${value.toFixed(0)} °C`;
    case "network":
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)} MB/s`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)} kB/s`;
      }
      return `${value.toFixed(0)} B/s`;
  }
}

function trimmed(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function formatAxis(metric: Metric, value: number): string {
  switch (metric) {
    case "memory":
    case "cpu":
      return `${trimmed(value)}%`;
    case "load":
      return trimmed(value);
    case "temperature":
      return `${trimmed(value)} °C`;
    case "network":
      if (value >= 1_000_000) {
        return `${trimmed(value / 1_000_000)} MB/s`;
      }
      if (value >= 1000) {
        return `${trimmed(value / 1000)} kB/s`;
      }
      return `${trimmed(value)} B/s`;
  }
}

const AXIS_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5];

export function axisTicks(highest: number): number[] {
  if (highest <= 0) {
    return [0, 1];
  }

  let best: { top: number; step: number; count: number } | undefined;
  const exponent = Math.floor(Math.log10(highest));

  for (const power of [exponent - 1, exponent]) {
    for (const base of AXIS_STEPS) {
      const step = base * 10 ** power;

      for (const count of [4, 5]) {
        const top = step * count;

        if (top >= highest && (best === undefined || top < best.top)) {
          best = { top, step, count };
        }
      }
    }
  }

  if (best === undefined) {
    return [0, highest];
  }

  const ticks: number[] = [];
  for (let index = 0; index <= best.count; index += 1) {
    ticks.push(Number((best.step * index).toPrecision(6)));
  }

  return ticks;
}

function readDetail(detail: unknown, key: string): unknown {
  if (typeof detail !== "object" || detail === null) {
    return undefined;
  }

  return (detail as Record<string, unknown>)[key];
}

export function describeEvent(event: TimelineEvent): string {
  if (event.kind === "lifecycle") {
    const name = readDetail(event.detail, "event");

    if (typeof name === "string") {
      return LIFECYCLE_TITLE[name] ?? name;
    }
  }

  return RULE_TITLE[event.kind] ?? event.kind;
}

export function eventNote(event: TimelineEvent): string | undefined {
  const usedPercent = readDetail(event.detail, "usedPercent");
  if (typeof usedPercent === "number") {
    return `${usedPercent.toFixed(1)}% in use when it was raised`;
  }

  const aheadMs = readDetail(event.detail, "aheadMs");
  if (typeof aheadMs === "number") {
    return `${formatDuration(aheadMs)} ahead`;
  }

  return undefined;
}

export function eventLength(event: TimelineEvent): string | undefined {
  if (event.source === "agent") {
    return undefined;
  }
  if (event.endedAtMs === undefined) {
    return "still going on";
  }

  return `lasted ${formatDuration(event.endedAtMs - event.startedAtMs)}`;
}
