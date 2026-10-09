import type { SeriesPoint } from "./schemas/api";

export type ChartPoint = {
  atMs: number;
  value: number | undefined;
};

export function downsampleMax(
  points: SeriesPoint[],
  fromMs: number,
  toMs: number,
  maxPoints: number,
): SeriesPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const bucketMs = (toMs - fromMs) / maxPoints;
  const highest = new Map<number, SeriesPoint>();

  for (const point of points) {
    const bucket = Math.floor((point.atMs - fromMs) / bucketMs);
    const current = highest.get(bucket);

    if (current === undefined || point.value > current.value) {
      highest.set(bucket, point);
    }
  }

  return [...highest.values()];
}

export function breakAtGaps(
  points: SeriesPoint[],
  maxGapMs: number,
): ChartPoint[] {
  const chartPoints: ChartPoint[] = [];
  let previous: SeriesPoint | undefined;

  for (const point of points) {
    if (previous !== undefined && point.atMs - previous.atMs > maxGapMs) {
      chartPoints.push({ atMs: previous.atMs + 1, value: undefined });
    }

    chartPoints.push(point);
    previous = point;
  }

  return chartPoints;
}
