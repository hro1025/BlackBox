import type { LoadAvg } from "@blackbox/shared";

export function parseLoadAvgInfo(text: string): LoadAvg {
  const lines = text.split("\n");

  const firstLine = lines[0];
  if (firstLine === undefined) {
    throw new Error("Malformed /proc/loadavg: no lines found");
  }

  const parts = firstLine.split(/\s+/);
  const numbers = parts.map((part) => Number.parseFloat(part));
  const [load1, load5, load15] = numbers;

  if (load1 === undefined || load5 === undefined || load15 === undefined) {
    throw new Error("Malformed /proc/loadavg line: missing expected field");
  }
  return { load1, load5, load15 };
}
