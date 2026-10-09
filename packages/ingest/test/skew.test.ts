import { expect, test } from "bun:test";
import { checkSkew } from "../src/rules/skew";

test("12.4 a sample from a second ago raises nothing", () => {
  expect(checkSkew("agent-a", 99000, 100000).raise).toBe(false);
});

test("12.4 a sample from five minutes in the future raises once", () => {
  const first = checkSkew("agent-b", 400000, 100000);
  const second = checkSkew("agent-b", 401000, 101000);

  expect(first.raise).toBe(true);
  expect(first.aheadMs).toBe(300000);
  expect(second.raise).toBe(false);
});

test("12.4 an old sample is late, not skewed", () => {
  expect(checkSkew("agent-c", 0, 600000).raise).toBe(false);
});

test("12.4 skew clears when the clocks agree, not on an old sample", () => {
  checkSkew("agent-d", 400000, 100000);

  expect(checkSkew("agent-d", 0, 600000).clear).toBe(false);
  expect(checkSkew("agent-d", 700000, 701000).clear).toBe(true);
  expect(checkSkew("agent-d", 701000, 702000).clear).toBe(false);
});
