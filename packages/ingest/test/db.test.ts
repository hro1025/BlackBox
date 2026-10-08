import { expect, test } from "bun:test";

process.env.BLACKBOX_INGEST_DB = ":memory:";
const { countSamples, insertSample, readLastSequence } =
  await import("../src/storage/db");

test("10.2 last sequence is 0 for an agent with nothing stored", () => {
  expect(readLastSequence("agent-a")).toBe(0);
});

test("10.2 last sequence is kept per agent", () => {
  insertSample({
    agentId: "agent-a",
    sequence: 1,
    kind: "cpu",
    sampledAtMs: 1000,
    payload: { user: 1 },
  });
  insertSample({
    agentId: "agent-a",
    sequence: 2,
    kind: "memory",
    sampledAtMs: 2000,
    payload: { totalKb: 2 },
  });
  insertSample({
    agentId: "agent-b",
    sequence: 9,
    kind: "cpu",
    sampledAtMs: 3000,
    payload: { user: 3 },
  });

  expect(readLastSequence("agent-a")).toBe(2);
  expect(readLastSequence("agent-b")).toBe(9);
});

test("10.4 a sample with a known agent and sequence is ignored", () => {
  const sample = {
    agentId: "agent-c",
    sequence: 5,
    kind: "cpu",
    sampledAtMs: 4000,
    payload: { user: 4 },
  };

  expect(insertSample(sample)).toBe(true);
  expect(insertSample(sample)).toBe(false);
  expect(countSamples("agent-c")).toBe(1);
});
