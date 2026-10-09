import { expect, test } from "bun:test";

process.env.BLACKBOX_INGEST_DB = ":memory:";
const {
  closeOpenRuleEvents,
  countRuleEvents,
  countSamples,
  endRuleEvent,
  insertRuleEvent,
  insertSample,
  readLastSequence,
} = await import("../src/storage/db");

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

test("12.1 a rule event is stored and gets its own id", () => {
  const first = insertRuleEvent({
    agentId: "agent-d",
    kind: "memory-high",
    startedAtMs: 5000,
    detail: { usedPercent: 96 },
  });
  const second = insertRuleEvent({
    agentId: "agent-d",
    kind: "memory-high",
    startedAtMs: 6000,
    detail: { usedPercent: 97 },
  });

  expect(second).toBe(first + 1);
  expect(countRuleEvents("agent-d")).toBe(2);
  expect(readLastSequence("agent-d")).toBe(0);
});

test("12.2 ending a rule event closes the open one and nothing else", () => {
  insertRuleEvent({
    agentId: "agent-e",
    kind: "memory-high",
    startedAtMs: 7000,
    detail: { usedPercent: 96 },
  });
  insertRuleEvent({
    agentId: "agent-f",
    kind: "memory-high",
    startedAtMs: 7000,
    detail: { usedPercent: 96 },
  });

  expect(endRuleEvent("agent-e", "memory-high", 9000)).toBe(1);
  expect(endRuleEvent("agent-e", "memory-high", 9500)).toBe(0);
  expect(endRuleEvent("agent-f", "memory-high", 9500)).toBe(1);
});

test("12.2 all open rule events can be closed at once", () => {
  insertRuleEvent({
    agentId: "agent-g",
    kind: "silence",
    startedAtMs: 8000,
    detail: {},
  });

  expect(closeOpenRuleEvents(9000)).toBeGreaterThanOrEqual(1);
  expect(endRuleEvent("agent-g", "silence", 9500)).toBe(0);
  expect(closeOpenRuleEvents(9500)).toBe(0);
});
