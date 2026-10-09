import { expect, test } from "bun:test";
import { findNewlySilent, noteHeard } from "../src/rules/silence";

function wentSilent(agentId: string, nowMs: number): boolean {
  return findNewlySilent(nowMs).some((agent) => agent.agentId === agentId);
}

test("12.3 an agent heard less than 15 seconds ago is not silent", () => {
  noteHeard("agent-a", 0);

  expect(wentSilent("agent-a", 14000)).toBe(false);
});

test("12.3 an agent that stops sending is reported once", () => {
  noteHeard("agent-b", 0);

  expect(wentSilent("agent-b", 15000)).toBe(true);
  expect(wentSilent("agent-b", 20000)).toBe(false);
});

test("12.3 the report carries the time the agent was last heard", () => {
  noteHeard("agent-c", 1000);
  noteHeard("agent-c", 5000);

  const report = findNewlySilent(60000).find(
    (agent) => agent.agentId === "agent-c",
  );

  expect(report).toEqual({ agentId: "agent-c", lastHeardAtMs: 5000 });
});

test("12.3 hearing from a silent agent ends the silence once", () => {
  noteHeard("agent-d", 0);
  findNewlySilent(15000);

  expect(noteHeard("agent-d", 16000)).toBe(true);
  expect(noteHeard("agent-d", 17000)).toBe(false);
  expect(wentSilent("agent-d", 32000)).toBe(true);
});
