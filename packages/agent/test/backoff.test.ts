import { expect, test } from "bun:test";
import { reconnectDelayMs } from "../src/connection/backoff";

test("9.3 delay doubles with each attempt", () => {
  expect(reconnectDelayMs(0, 0)).toBe(1000);
  expect(reconnectDelayMs(1, 0)).toBe(2000);
  expect(reconnectDelayMs(3, 0)).toBe(8000);
});

test("9.3 delay is capped at 30 seconds", () => {
  expect(reconnectDelayMs(5, 0)).toBe(30000);
  expect(reconnectDelayMs(10, 0)).toBe(30000);
});

test("9.3 jitter is added on top of the delay", () => {
  expect(reconnectDelayMs(0, 0.5)).toBe(1500);
  expect(reconnectDelayMs(10, 0.5)).toBe(30500);
});
