import { recordCpu } from "./src/recorders/cpu";
import { recordLoadAvg } from "./src/recorders/loadavg";
import { recordMemory } from "./src/recorders/memory";
import { recordNetwork } from "./src/recorders/netdev";
import { recordThermal } from "./src/recorders/thermal";
import { flush } from "./src/storage/buffer";
import { readBootId } from "./src/lifecycle/bootid";

const SAMPLE_INTERVAL_MS = 1000;
const FLUSH_INTERVAL_MS = 1000;

try {
  const bootId = await readBootId();
  console.log(`Boot ID: ${bootId}`);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Failed to read boot id: ${error.message}`);
  } else {
    console.error("Failed to read boot id:", error);
  }
}

function recordAll(): void {
  void recordCpu();
  void recordLoadAvg();
  void recordMemory();
  void recordNetwork();
  void recordThermal();
}

setInterval(recordAll, SAMPLE_INTERVAL_MS);
setInterval(flush, FLUSH_INTERVAL_MS);
