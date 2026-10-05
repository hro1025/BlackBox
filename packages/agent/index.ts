import { recordCpu } from "./src/recorders/cpu";
import { recordLoadAvg } from "./src/recorders/loadavg";
import { recordMemory } from "./src/recorders/memory";
import { recordNetwork } from "./src/recorders/netdev";
import { recordThermal } from "./src/recorders/thermal";
import { flush } from "./src/storage/buffer";

const SAMPLE_INTERVAL_MS = 1000;
const FLUSH_INTERVAL_MS = 1000;

function recordAll(): void {
  void recordCpu();
  void recordLoadAvg();
  void recordMemory();
  void recordNetwork();
  void recordThermal();
}

setInterval(recordAll, SAMPLE_INTERVAL_MS);
setInterval(flush, FLUSH_INTERVAL_MS);
