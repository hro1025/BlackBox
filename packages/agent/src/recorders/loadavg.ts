import { parseLoadAvgInfo } from "../collectors/loadavg";
import { addSample } from "../storage/buffer";

export async function recordLoadAvg(): Promise<void> {
  try {
    const file = Bun.file("/proc/loadavg");
    const text = await file.text();

    addSample({
      kind: "loadavg",
      sampledAtMs: Date.now(),
      payload: parseLoadAvgInfo(text),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read loadavg: ${error.message}`);
    } else {
      console.error("Failed to read loadavg:", error);
    }
  }
}
