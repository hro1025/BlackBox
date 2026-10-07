import { expect, test } from "bun:test";
import { MessageSchema } from "../src/schemas/messages";

test("7.4 valid hello passes", () => {
  const result = MessageSchema.safeParse({
    type: "hello",
    agentId: "arch-desktop",
    token: "secret-token",
    protocolVersion: 1,
    bootId: "55a6e8e1-acd2-4cb0-8756-5f7ed8ed4541",
  });

  expect(result.success).toBe(true);
});

test("7.4 valid welcome passes", () => {
  const result = MessageSchema.safeParse({
    type: "welcome",
    lastSeq: 5,
  });

  expect(result.success).toBe(true);
});

test("7.4 valid sample passes", () => {
  const result = MessageSchema.safeParse({
    type: "sample",
    seq: 1913,
    kind: "loadavg",
    sampledAtMs: 1791359531042,
    data: { load1: 0.5, load5: 0.4, load15: 0.3 },
  });

  expect(result.success).toBe(true);
});

test("7.4 valid event passes", () => {
  const result = MessageSchema.safeParse({
    type: "event",
    seq: 2472,
    kind: "lifecycle",
    sampledAtMs: 1791360303594,
    detail: { event: "agent-crashed" },
  });

  expect(result.success).toBe(true);
});

test("7.4 valid ack passes", () => {
  const result = MessageSchema.safeParse({ type: "ack", seq: 5 });

  expect(result.success).toBe(true);
});

test("7.5 unknown type is rejected", () => {
  const result = MessageSchema.safeParse({ type: "banana", seq: 5 });

  expect(result.success).toBe(false);
});

test("7.5 missing field is rejected", () => {
  const result = MessageSchema.safeParse({ type: "ack" });

  expect(result.success).toBe(false);
});

test("7.5 string where a number belongs is rejected", () => {
  const result = MessageSchema.safeParse({ type: "ack", seq: "5" });

  expect(result.success).toBe(false);
});
