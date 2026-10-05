import { expect, test } from "bun:test";

process.env.BLACKBOX_DB = ":memory:";
const { insertSamples, readSamplesAfter } = await import("../src/storage/db");

test("5.5 reader returns exactly the samples after a position", () => {
  insertSamples([
    { kind: "memory", sampledAtMs: 1000, payload: { totalKb: 1 } },
    { kind: "cpu", sampledAtMs: 2000, payload: { user: 2 } },
    { kind: "loadavg", sampledAtMs: 3000, payload: { load1: 3 } },
  ]);

  expect(readSamplesAfter(1)).toEqual([
    { sequence: 2, kind: "cpu", sampledAtMs: 2000, payload: { user: 2 } },
    { sequence: 3, kind: "loadavg", sampledAtMs: 3000, payload: { load1: 3 } },
  ]);

  expect(readSamplesAfter(3)).toEqual([]);
});
