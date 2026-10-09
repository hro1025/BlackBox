import { expect, test } from "bun:test";
import { toLivePoints } from "../src/live";

function cpu(busy: number, idle: number): unknown {
  return {
    user: busy,
    nice: 0,
    system: 0,
    idle,
    iowait: 0,
    irq: 0,
    softirq: 0,
    steal: 0,
  };
}

test("13.6 a memory sample becomes one live point", () => {
  const points = toLivePoints("live-a", {
    sequence: 1,
    kind: "memory",
    sampledAtMs: 1000,
    payload: {
      totalKb: 1000,
      availableKb: 250,
      freeKb: 0,
      swapTotalKb: 0,
      swapFreeKb: 0,
    },
  });

  expect(points).toEqual([
    {
      type: "point",
      agentId: "live-a",
      metric: "memory",
      atMs: 1000,
      value: 75,
    },
  ]);
});

test("13.6 a cpu sample needs the one before it", () => {
  const first = toLivePoints("live-b", {
    sequence: 1,
    kind: "cpu",
    sampledAtMs: 1000,
    payload: cpu(100, 100),
  });
  const second = toLivePoints("live-b", {
    sequence: 2,
    kind: "cpu",
    sampledAtMs: 2000,
    payload: cpu(150, 150),
  });

  expect(first).toEqual([]);
  expect(second).toEqual([
    { type: "point", agentId: "live-b", metric: "cpu", atMs: 2000, value: 50 },
  ]);
});

test("13.6 the sample before is remembered per agent", () => {
  toLivePoints("live-c", {
    sequence: 1,
    kind: "cpu",
    sampledAtMs: 1000,
    payload: cpu(100, 100),
  });
  const other = toLivePoints("live-d", {
    sequence: 1,
    kind: "cpu",
    sampledAtMs: 2000,
    payload: cpu(150, 150),
  });

  expect(other).toEqual([]);
});

test("13.6 a sample of an unknown kind becomes no live point", () => {
  const points = toLivePoints("live-e", {
    sequence: 1,
    kind: "lifecycle",
    sampledAtMs: 1000,
    payload: {},
  });

  expect(points).toEqual([]);
});
