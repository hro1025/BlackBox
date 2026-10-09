import { expect, test } from "bun:test";
import {
  evaluateThreshold,
  INITIAL_THRESHOLD_STATE,
} from "../src/rules/threshold";
import type { ThresholdResult, ThresholdState } from "../src/rules/threshold";

function check(
  previous: ThresholdState,
  value: number,
  atMs: number,
): ThresholdResult {
  return evaluateThreshold(previous, value, atMs, 80, 30000, 75);
}

function raised(): ThresholdState {
  const first = check(INITIAL_THRESHOLD_STATE, 90, 0);
  const second = check(first.state, 90, 30000);

  return second.state;
}

test("12.1 a value below the threshold raises nothing", () => {
  const result = check(INITIAL_THRESHOLD_STATE, 50, 0);

  expect(result.raise).toBe(false);
  expect(result.state).toEqual({ aboveSinceMs: undefined, raised: false });
});

test("12.1 above the threshold for less than the duration raises nothing", () => {
  const first = check(INITIAL_THRESHOLD_STATE, 90, 0);
  const second = check(first.state, 90, 29000);

  expect(first.raise).toBe(false);
  expect(second.raise).toBe(false);
  expect(second.state).toEqual({ aboveSinceMs: 0, raised: false });
});

test("12.1 above the threshold for the full duration raises once", () => {
  const first = check(INITIAL_THRESHOLD_STATE, 90, 0);
  const second = check(first.state, 90, 30000);
  const third = check(second.state, 90, 31000);

  expect(second.raise).toBe(true);
  expect(third.raise).toBe(false);
  expect(third.state).toEqual({ aboveSinceMs: 0, raised: true });
});

test("12.1 dropping below the threshold starts the duration over", () => {
  const first = check(INITIAL_THRESHOLD_STATE, 90, 0);
  const second = check(first.state, 50, 20000);
  const third = check(second.state, 90, 25000);
  const fourth = check(third.state, 90, 40000);

  expect(third.state).toEqual({ aboveSinceMs: 25000, raised: false });
  expect(fourth.raise).toBe(false);
});

test("12.2 a raised rule stays raised between the two limits", () => {
  const dip = check(raised(), 78, 31000);
  const back = check(dip.state, 90, 32000);

  expect(dip.clear).toBe(false);
  expect(dip.state.raised).toBe(true);
  expect(back.raise).toBe(false);
});

test("12.2 a raised rule clears below the lower limit", () => {
  const result = check(raised(), 74, 31000);

  expect(result.clear).toBe(true);
  expect(result.state).toEqual({ aboveSinceMs: undefined, raised: false });
});

test("12.2 a cleared rule can raise again", () => {
  const cleared = check(raised(), 74, 31000);
  const first = check(cleared.state, 90, 40000);
  const second = check(first.state, 90, 70000);

  expect(first.raise).toBe(false);
  expect(second.raise).toBe(true);
});
