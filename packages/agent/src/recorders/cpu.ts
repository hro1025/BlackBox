import type { CpuTimes } from "@blackbox/shared";
import { cpuUsagePercent } from "@blackbox/shared";
import { parseCpuInfo } from "../collectors/cpu";
import { addSample } from "../storage/buffer";

let previousCpu: CpuTimes | undefined;

export async function recordCpu(): Promise<void> {
  try {
    const file = Bun.file("/proc/stat");
    const text = await file.text();

    const current = parseCpuInfo(text);

    addSample({
      kind: "cpu",
      sampledAtMs: Date.now(),
      payload: current,
    });

    if (previousCpu !== undefined) {
      const usagePercent = cpuUsagePercent(previousCpu, current);
      console.log({ usagePercent });
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
