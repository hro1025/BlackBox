import type { NetSample } from "@blackbox/shared";
import { bytesPerSecond } from "@blackbox/shared";
import { parseNetDevInfo } from "../collectors/netdev";
import { addSample } from "../storage/buffer";

let previousNet: NetSample | undefined;

export async function recordNetwork(): Promise<void> {
  try {
    const file = Bun.file("/proc/net/dev");
    const text = await file.text();

    const current: NetSample = {
      interfaces: parseNetDevInfo(text),
      sampledAtMs: Date.now(),
    };

    addSample({
      kind: "netdev",
      sampledAtMs: current.sampledAtMs,
      payload: current.interfaces,
    });

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

        console.log({ name: iface.name, bytesInPerSecond, bytesOutPerSecond });
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
