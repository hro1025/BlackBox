import type { CpuTimes } from "@blackbox/shared";

export function parseCpuInfo(text: string): CpuTimes {
  const lines = text.split("\n");

  const firstLine = lines[0];
  if (firstLine === undefined) {
    throw new Error("Malformed /proc/stat: no lines found");
  }

  const parts = firstLine.split(/\s+/);
  const values = parts.slice(1);
  const numbers = values.map((value) => Number.parseInt(value));

  const [user, nice, system, idle, iowait, irq, softirq, steal] = numbers;

  if (
    user === undefined ||
    nice === undefined ||
    system === undefined ||
    idle === undefined ||
    iowait === undefined ||
    irq === undefined ||
    softirq === undefined ||
    steal === undefined
  ) {
    throw new Error("Malformed /proc/stat line: missing expected field");
  }

  return { user, nice, system, idle, iowait, irq, softirq, steal };
}
