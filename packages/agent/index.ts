import type { MemoryStats } from "@blackbox/shared";

const file = Bun.file("/proc/meminfo");
const text = await file.text();

function parseMemoryInfo(text: string): MemoryStats {
  const lines = text.split("\n");

  const values: Record<string, number> = {};

  for (const line of lines) {
    const [key, value] = line.replace(/:/, " ").trim().split(/\s+/, 2);

    if (key !== undefined && value !== undefined) {
      values[key] = Number.parseInt(value);
    }
  }

  const requiredFields = [
    "MemTotal",
    "MemAvailable",
    "MemFree",
    "SwapTotal",
    "SwapFree",
  ];

  const missingFields = requiredFields.filter(
    (field) => values[field] === undefined,
  );
  if (missingFields.length > 0) {
    throw new Error(`meminfo is missing: ${missingFields.join(", ")}`);
  }

  return {
    totalKb: values["MemTotal"]!,
    availableKb: values["MemAvailable"]!,
    freeKb: values["MemFree"]!,
    swapTotalKb: values["SwapTotal"]!,
    swapFreeKb: values["SwapFree"]!,
  };
}
try {
  const stats = parseMemoryInfo(text);
  console.log(stats);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Failed to read memory: ${error.message}`);
  } else {
    console.error("Failed to read memory:", error);
  }
}
