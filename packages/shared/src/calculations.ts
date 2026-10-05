import type { CpuTimes } from "./types";

export function bytesPerSecond(
  previousBytes: number,
  currentBytes: number,
  elapsedMs: number,
): number | undefined {
  const byteDelta = currentBytes - previousBytes;

  if (byteDelta < 0 || elapsedMs <= 0) {
    return undefined;
  }

  return byteDelta / (elapsedMs / 1000);
}

export function cpuUsagePercent(previous: CpuTimes, current: CpuTimes): number {
  const previousIdle = previous.idle + previous.iowait;
  const previousBusy =
    previous.user +
    previous.nice +
    previous.system +
    previous.irq +
    previous.softirq +
    previous.steal;

  const currentIdle = current.idle + current.iowait;
  const currentBusy =
    current.user +
    current.nice +
    current.system +
    current.irq +
    current.softirq +
    current.steal;

  const previousTotal = previousIdle + previousBusy;
  const currentTotal = currentIdle + currentBusy;

  const totalDelta = currentTotal - previousTotal;
  const idleDelta = currentIdle - previousIdle;

  if (totalDelta === 0) {
    return 0;
  }
  return ((totalDelta - idleDelta) / totalDelta) * 100;
}
