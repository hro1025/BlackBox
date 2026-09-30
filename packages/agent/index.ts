import type { MemorySample } from "@blackbox/shared";
import { parseMemoryInfo } from "./src/collectors/memory";

const SAMPLE_INTERVAL_MS = 1000;

async function recordMemory(): Promise<void> {
  try {
    const file = Bun.file("/proc/meminfo");
    const text = await file.text();

    const sample: MemorySample = {
      ...parseMemoryInfo(text),
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
