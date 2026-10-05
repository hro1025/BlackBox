import type { LoadAvgSample } from "@blackbox/shared";
import { parseLoadAvgInfo } from "../collectors/loadavg";

export async function recordLoadAvg(): Promise<void> {
  try {
    const file = Bun.file("/proc/loadavg");
    const text = await file.text();

    const sample: LoadAvgSample = {
      ...parseLoadAvgInfo(text),
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
