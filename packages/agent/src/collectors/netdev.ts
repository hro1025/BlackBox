import type { NetInterface } from "@blackbox/shared";

export function parserNetDevInfo(text: string): NetInterface[] {
  const lines = text.split("\n");
  const sliceLines = lines.slice(2);

  const result: NetInterface[] = [];

  for (const line of sliceLines) {
    const parts = line.replace(/:/, " ").trim().split(/\s+/);

    const name = parts[0];
    const bytesInText = parts[1];
    const bytesOutText = parts[9];

    if (name === undefined || name === "" || name === "lo") {
      continue;
    }

    if (bytesInText === undefined || bytesOutText === undefined) {
      throw new Error(`Malformed /proc/net/dev line for ${name}`);
    }
    result.push({
      name,
      bytesIn: Number.parseInt(bytesInText),
      bytesOut: Number.parseInt(bytesOutText),
    });
  }
  return result;
}
