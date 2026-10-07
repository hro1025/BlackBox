import { recordCpu } from "./src/recorders/cpu";
import { recordLoadAvg } from "./src/recorders/loadavg";
import { recordMemory } from "./src/recorders/memory";
import { recordNetwork } from "./src/recorders/netdev";
import { recordThermal } from "./src/recorders/thermal";
import { addSample, flush } from "./src/storage/buffer";
import {
  readBootId,
  readLastBootId,
  writeLastBootId,
} from "./src/lifecycle/bootid";
import { classifyStartup } from "./src/lifecycle/classify";
import { deleteMarker, readMarker, writeMarker } from "./src/lifecycle/marker";

const SAMPLE_INTERVAL_MS = 1000;
const FLUSH_INTERVAL_MS = 1000;

let bootId: string | undefined;

try {
  bootId = await readBootId();
  console.log(`Boot ID: ${bootId}`);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Failed to read boot id: ${error.message}`);
  } else {
    console.error("Failed to read boot id:", error);
  }
}

async function checkStartup(currentBootId: string): Promise<void> {
  try {
    const marker = await readMarker();
    const lastBootId = await readLastBootId();

    if (lastBootId === undefined) {
      console.log("Startup: first start");
    } else {
      const kind = classifyStartup(
        marker !== undefined,
        lastBootId !== currentBootId,
      );
      console.log(`Startup: ${kind}`);
      addSample({
        kind: "lifecycle",
        sampledAtMs: Date.now(),
        payload: { event: kind },
      });
    }

    if (marker !== undefined) {
      await deleteMarker();
    }

    await writeLastBootId(currentBootId);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to check startup: ${error.message}`);
    } else {
      console.error("Failed to check startup:", error);
    }
  }
}

async function stop(): Promise<void> {
  console.log("Stopping");
  flush();

  try {
    if (bootId !== undefined) {
      await writeMarker(bootId);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to write marker: ${error.message}`);
    } else {
      console.error("Failed to write marker:", error);
    }
  }

  process.exit(0);
}

function requestStop(): void {
  void stop();
}

function recordAll(): void {
  void recordCpu();
  void recordLoadAvg();
  void recordMemory();
  void recordNetwork();
  void recordThermal();
}

if (bootId !== undefined) {
  await checkStartup(bootId);
}

process.on("SIGINT", requestStop);
process.on("SIGTERM", requestStop);

setInterval(recordAll, SAMPLE_INTERVAL_MS);
setInterval(flush, FLUSH_INTERVAL_MS);
