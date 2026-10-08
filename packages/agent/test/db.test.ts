import { expect, test } from "bun:test";

process.env.BLACKBOX_DB = ":memory:";
const { insertSamples, readLastSequence, readSamplesAfter } =
  await import("../src/storage/db");

test("9.2 last sequence is 0 on an empty database", () => {
  expect(readLastSequence()).toBe(0);
});

test("5.5 reader returns exactly the samples after a position", () => {
  insertSamples([
    { kind: "memory", sampledAtMs: 1000, payload: { totalKb: 1 } },
    { kind: "cpu", sampledAtMs: 2000, payload: { user: 2 } },
    { kind: "loadavg", sampledAtMs: 3000, payload: { load1: 3 } },
  ]);

  expect(readSamplesAfter(1, 10)).toEqual([
    { sequence: 2, kind: "cpu", sampledAtMs: 2000, payload: { user: 2 } },
    { sequence: 3, kind: "loadavg", sampledAtMs: 3000, payload: { load1: 3 } },
  ]);

  expect(readSamplesAfter(3, 10)).toEqual([]);
});

test("9.2 last sequence is the highest sequence written", () => {
  const before = readLastSequence();

  insertSamples([
    { kind: "memory", sampledAtMs: 4000, payload: { totalKb: 4 } },
    { kind: "cpu", sampledAtMs: 5000, payload: { user: 5 } },
  ]);

  expect(readLastSequence()).toBe(before + 2);
});

test("10.5 reader returns at most the requested number of samples", () => {
  const rows = readSamplesAfter(0, 2);

  expect(rows.map((row) => row.sequence)).toEqual([1, 2]);
});
