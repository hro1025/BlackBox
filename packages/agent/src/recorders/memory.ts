import { parseMemoryInfo } from "../collectors/memory";
import { addSample } from "../storage/buffer";

export async function recordMemory(): Promise<void> {
  try {
    const file = Bun.file("/proc/meminfo");
    const text = await file.text();

    addSample({
      kind: "memory",
      sampledAtMs: Date.now(),
      payload: parseMemoryInfo(text),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read memory: ${error.message}`);
    } else {
      console.error("Failed to read memory:", error);
    }
  }
}
