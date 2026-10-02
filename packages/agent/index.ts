import type {
  CpuTimes,
  LoadAvgSample,
  MemorySample,
  NetSample,
} from "@blackbox/shared";
import { bytesPerSecond, cpuUsagePercent } from "@blackbox/shared";
import { parserCpuInfo } from "./src/collectors/cpu";
import { parserLoadAvgInfo } from "./src/collectors/loadavg";
import { parserMemoryInfo } from "./src/collectors/memory";
import { parserNetDevInfo } from "./src/collectors/netdev";

const SAMPLE_INTERVAL_MS = 1000;

let previousCpu: CpuTimes | undefined;
let previousNet: NetSample | undefined;

async function recordCpu(): Promise<void> {
  try {
    const file = Bun.file("/proc/stat");
    const text = await file.text();

    const current = parserCpuInfo(text);

    if (previousCpu !== undefined) {
      const usagePercent = cpuUsagePercent(previousCpu, current);
      console.log({ usagePercent, sampledAtMs: Date.now() });
    }

    previousCpu = current;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read cpu: ${error.message}`);
    } else {
      console.error("Failed to read cpu:", error);
    }
  }
}

async function recordMemory(): Promise<void> {
  try {
    const file = Bun.file("/proc/meminfo");
    const text = await file.text();

    const sample: MemorySample = {
      ...parserMemoryInfo(text),
      sampledAtMs: Date.now(),
    };

    console.log(sample);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read memory: ${error.message}`);
    } else {
      console.error("Failed to read memory:", error);
    }
  }
}

async function recordLoadAvg(): Promise<void> {
  try {
    const file = Bun.file("/proc/loadavg");
    const text = await file.text();

    const sample: LoadAvgSample = {
      ...parserLoadAvgInfo(text),
      sampledAtMs: Date.now(),
    };

    console.log(sample);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read loadavg: ${error.message}`);
    } else {
      console.error("Failed to read loadavg:", error);
    }
  }
}

async function recordNetwork(): Promise<void> {
  try {
    const file = Bun.file("/proc/net/dev");
    const text = await file.text();

    const current: NetSample = {
      interfaces: parserNetDevInfo(text),
      sampledAtMs: Date.now(),
    };

    const previous = previousNet;
    if (previous !== undefined) {
      const elapsedMs = current.sampledAtMs - previous.sampledAtMs;

      for (const iface of current.interfaces) {
        const before = previous.interfaces.find(
          (candidate) => candidate.name === iface.name,
        );
        if (before === undefined) {
          continue;
        }

        const bytesInPerSecond = bytesPerSecond(
          before.bytesIn,
          iface.bytesIn,
          elapsedMs,
        );
        const bytesOutPerSecond = bytesPerSecond(
          before.bytesOut,
          iface.bytesOut,
          elapsedMs,
        );
        if (bytesInPerSecond === undefined || bytesOutPerSecond === undefined) {
          continue;
        }

        console.log({
          name: iface.name,
          bytesInPerSecond,
          bytesOutPerSecond,
          sampledAtMs: current.sampledAtMs,
        });
      }
    }

    previousNet = current;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read netdev: ${error.message}`);
    } else {
      console.error("Failed to read netdev:", error);
    }
  }
}

setInterval(() => void recordCpu(), SAMPLE_INTERVAL_MS);
setInterval(() => void recordMemory(), SAMPLE_INTERVAL_MS);
setInterval(() => void recordLoadAvg(), SAMPLE_INTERVAL_MS);
setInterval(() => void recordNetwork(), SAMPLE_INTERVAL_MS);
