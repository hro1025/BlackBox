import { MetricSchema } from "@blackbox/shared";
import type { LivePoint } from "@blackbox/shared";
import { SAMPLE_KIND, toSeries } from "./metrics";
import type { StoredSample } from "./storage/db";

const previousSamples = new Map<string, StoredSample>();

export function liveTopic(agentId: string): string {
  return `agent:${agentId}`;
}

export function toLivePoints(
  agentId: string,
  sample: StoredSample,
): LivePoint[] {
  const key = `${agentId}|${sample.kind}`;
  const previous = previousSamples.get(key);
  previousSamples.set(key, sample);

  const samples = previous === undefined ? [sample] : [previous, sample];
  const points: LivePoint[] = [];

  for (const metric of MetricSchema.options) {
    if (SAMPLE_KIND[metric] !== sample.kind) {
      continue;
    }

    for (const point of toSeries(metric, samples)) {
      if (point.atMs === sample.sampledAtMs) {
        points.push({
          type: "point",
          agentId,
          metric,
          atMs: point.atMs,
          value: point.value,
        });
      }
    }
  }

  return points;
}
