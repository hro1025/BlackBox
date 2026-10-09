import { expect, test } from "bun:test";
import { toSeries } from "../src/metrics";
import type { StoredSample } from "../src/storage/db";

function sample(
  sequence: number,
  kind: string,
  sampledAtMs: number,
  payload: unknown,
): StoredSample {
  return { sequence, kind, sampledAtMs, payload };
}

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

test("13.5 memory series is used memory in percent", () => {
  const samples = [
    sample(1, "memory", 1000, {
      totalKb: 1000,
      availableKb: 250,
      freeKb: 0,
      swapTotalKb: 0,
      swapFreeKb: 0,
    }),
  ];

  expect(toSeries("memory", samples)).toEqual([{ atMs: 1000, value: 75 }]);
});

test("13.5 cpu series is the usage between two neighbouring samples", () => {
  const samples = [
    sample(1, "cpu", 1000, cpu(100, 100)),
    sample(2, "cpu", 2000, cpu(150, 150)),
    sample(3, "cpu", 3000, cpu(175, 225)),
  ];

  expect(toSeries("cpu", samples)).toEqual([
    { atMs: 2000, value: 50 },
    { atMs: 3000, value: 25 },
  ]);
});

test("13.5 cpu series does not bridge a long pause between samples", () => {
  const samples = [
    sample(1, "cpu", 1000, cpu(100, 100)),
    sample(2, "cpu", 60000, cpu(150, 150)),
    sample(3, "cpu", 61000, cpu(175, 225)),
  ];

  expect(toSeries("cpu", samples)).toEqual([{ atMs: 61000, value: 25 }]);
});

test("13.5 load series is the one-minute load", () => {
  const samples = [
    sample(1, "loadavg", 1000, { load1: 0.3, load5: 0.9, load15: 1.2 }),
  ];

  expect(toSeries("load", samples)).toEqual([{ atMs: 1000, value: 0.3 }]);
});

test("13.5 network series is bytes per second on real interfaces", () => {
  const samples = [
    sample(1, "netdev", 1000, [
      { name: "wlan0", bytesIn: 1000, bytesOut: 500 },
      { name: "docker0", bytesIn: 0, bytesOut: 0 },
    ]),
    sample(2, "netdev", 3000, [
      { name: "wlan0", bytesIn: 4000, bytesOut: 1500 },
      { name: "docker0", bytesIn: 900000, bytesOut: 900000 },
    ]),
  ];

  expect(toSeries("network", samples)).toEqual([{ atMs: 3000, value: 2000 }]);
});

test("13.5 temperature series is the hottest sensor", () => {
  const samples = [
    sample(1, "thermal", 1000, [
      { name: "SEN2", celsius: 0.05 },
      { name: "x86_pkg_temp", celsius: 40 },
      { name: "SEN5", celsius: 32.05 },
    ]),
  ];

  expect(toSeries("temperature", samples)).toEqual([{ atMs: 1000, value: 40 }]);
});
