import { expect, test } from "bun:test";
import { memoryUsedPercent } from "../src/calculations";
import type { MemoryStats } from "../src/schemas/memory";

function stats(totalKb: number, availableKb: number): MemoryStats {
  return {
    totalKb,
    availableKb,
    freeKb: 0,
    swapTotalKb: 0,
    swapFreeKb: 0,
  };
}

test("12.1 used percent is the share of memory that is not available", () => {
  expect(memoryUsedPercent(stats(1000, 250))).toBe(75);
  expect(memoryUsedPercent(stats(1000, 1000))).toBe(0);
  expect(memoryUsedPercent(stats(1000, 0))).toBe(100);
});

test("12.1 used percent is 0 when the total is 0", () => {
  expect(memoryUsedPercent(stats(0, 0))).toBe(0);
});
