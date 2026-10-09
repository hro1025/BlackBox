import { expect, test } from "bun:test";
import { checkMemory } from "../src/rules/memory";

function stats(availableKb: number): unknown {
  return {
    totalKb: 1000,
    availableKb,
    freeKb: 0,
    swapTotalKb: 0,
    swapFreeKb: 0,
  };
}

const HIGH = stats(20);
const MIDDLE = stats(80);
const LOW = stats(200);

test("12.1 memory rule raises once after 30 seconds above the threshold", () => {
  expect(checkMemory("agent-a", 0, HIGH).raise).toBe(false);
  expect(checkMemory("agent-a", 30000, HIGH).raise).toBe(true);
  expect(checkMemory("agent-a", 31000, HIGH).raise).toBe(false);
});

test("12.1 memory rule keeps its state per agent", () => {
  expect(checkMemory("agent-b", 0, HIGH).raise).toBe(false);
  expect(checkMemory("agent-c", 30000, HIGH).raise).toBe(false);
  expect(checkMemory("agent-b", 30000, HIGH).raise).toBe(true);
});

test("12.1 memory rule throws on data that is not memory stats", () => {
  expect(() => checkMemory("agent-d", 0, { user: 1 })).toThrow();
});

test("12.2 memory rule clears only below the lower limit", () => {
  checkMemory("agent-e", 0, HIGH);
  checkMemory("agent-e", 30000, HIGH);

  expect(checkMemory("agent-e", 31000, MIDDLE).clear).toBe(false);
  expect(checkMemory("agent-e", 32000, LOW).clear).toBe(true);
  expect(checkMemory("agent-e", 33000, LOW).clear).toBe(false);
});
