import type { ThermalZone } from "@blackbox/shared";
import { readdir } from "node:fs/promises";
import { parseTempCelsius } from "../collectors/thermal";
import { addSample } from "../storage/buffer";

const THERMAL_PATH = "/sys/class/thermal";

export async function recordThermal(): Promise<void> {
  try {
    const entries = await readdir(THERMAL_PATH);
    const zoneNames = entries.filter((entry) =>
      entry.startsWith("thermal_zone"),
    );

    const zones: ThermalZone[] = [];

    for (const zoneName of zoneNames) {
      try {
        const zonePath = `${THERMAL_PATH}/${zoneName}`;
        const typeText = await Bun.file(`${zonePath}/type`).text();
        const tempText = await Bun.file(`${zonePath}/temp`).text();

        zones.push({
          name: typeText.trim(),
          celsius: parseTempCelsius(tempText),
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Failed to read ${zoneName}: ${error.message}`);
        } else {
          console.error(`Failed to read ${zoneName}:`, error);
        }
      }
    }
    addSample({
      kind: "thermal",
      sampledAtMs: Date.now(),
      payload: zones,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read thermal: ${error.message}`);
    } else {
      console.error("Failed to read thermal:", error);
    }
  }
}
