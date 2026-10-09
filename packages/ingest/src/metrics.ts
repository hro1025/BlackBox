import {
  bytesPerSecond,
  CpuTimesSchema,
  cpuUsagePercent,
  LoadAvgSchema,
  MemoryStatsSchema,
  memoryUsedPercent,
  NetInterfaceSchema,
  ThermalZoneSchema,
} from "@blackbox/shared";
import type { CpuTimes, Metric, SeriesPoint } from "@blackbox/shared";
import type { StoredSample } from "./storage/db";

const MAX_PAIR_GAP_MS = 15 * 1000;
const VIRTUAL_INTERFACE_PREFIXES = ["lo", "veth", "br-", "docker", "virbr"];

export const SAMPLE_KIND: Record<Metric, string> = {
  memory: "memory",
  cpu: "cpu",
  load: "loadavg",
  network: "netdev",
  temperature: "thermal",
};

function memorySeries(samples: StoredSample[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];

  for (const sample of samples) {
    const stats = MemoryStatsSchema.safeParse(sample.payload);

    if (stats.success) {
      points.push({
        atMs: sample.sampledAtMs,
        value: memoryUsedPercent(stats.data),
      });
    }
  }

  return points;
}

function loadSeries(samples: StoredSample[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];

  for (const sample of samples) {
    const load = LoadAvgSchema.safeParse(sample.payload);

    if (load.success) {
      points.push({ atMs: sample.sampledAtMs, value: load.data.load1 });
    }
  }

  return points;
}

function temperatureSeries(samples: StoredSample[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];

  for (const sample of samples) {
    const zones = ThermalZoneSchema.array().safeParse(sample.payload);

    if (zones.success && zones.data.length > 0) {
      points.push({
        atMs: sample.sampledAtMs,
        value: Math.max(...zones.data.map((zone) => zone.celsius)),
      });
    }
  }

  return points;
}

function cpuSeries(samples: StoredSample[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  let previous: { atMs: number; times: CpuTimes } | undefined;

  for (const sample of samples) {
    const times = CpuTimesSchema.safeParse(sample.payload);
    if (!times.success) {
      continue;
    }

    if (
      previous !== undefined &&
      sample.sampledAtMs - previous.atMs <= MAX_PAIR_GAP_MS
    ) {
      const value = cpuUsagePercent(previous.times, times.data);

      if (value >= 0 && value <= 100) {
        points.push({ atMs: sample.sampledAtMs, value });
      }
    }

    previous = { atMs: sample.sampledAtMs, times: times.data };
  }

  return points;
}

function networkSeries(samples: StoredSample[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  let previous: { atMs: number; totalBytes: number } | undefined;

  for (const sample of samples) {
    const interfaces = NetInterfaceSchema.array().safeParse(sample.payload);
    if (!interfaces.success) {
      continue;
    }

    let totalBytes = 0;
    for (const item of interfaces.data) {
      const isVirtual = VIRTUAL_INTERFACE_PREFIXES.some((prefix) =>
        item.name.startsWith(prefix),
      );

      if (!isVirtual) {
        totalBytes += item.bytesIn + item.bytesOut;
      }
    }

    if (
      previous !== undefined &&
      sample.sampledAtMs - previous.atMs <= MAX_PAIR_GAP_MS
    ) {
      const value = bytesPerSecond(
        previous.totalBytes,
        totalBytes,
        sample.sampledAtMs - previous.atMs,
      );

      if (value !== undefined) {
        points.push({ atMs: sample.sampledAtMs, value });
      }
    }

    previous = { atMs: sample.sampledAtMs, totalBytes };
  }

  return points;
}

export function toSeries(
  metric: Metric,
  samples: StoredSample[],
): SeriesPoint[] {
  switch (metric) {
    case "memory":
      return memorySeries(samples);
    case "cpu":
      return cpuSeries(samples);
    case "load":
      return loadSeries(samples);
    case "network":
      return networkSeries(samples);
    case "temperature":
      return temperatureSeries(samples);
  }
}
