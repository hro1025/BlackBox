import type { MemorySample, CpuTimes } from "@blackbox/shared";
import { cpuUsagePercent } from "@blackbox/shared";
import { parserMemoryInfo } from "./src/collectors/memory";
import { parserCpuInfo } from "./src/collectors/cpu";

const SAMPLE_INTERVAL_MS = 1000;
let previousCpu: CpuTimes | undefined;

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

setInterval(() => void recordCpu(), SAMPLE_INTERVAL_MS);

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

setInterval(() => void recordMemory(), SAMPLE_INTERVAL_MS);
