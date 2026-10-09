import { expect, test } from "bun:test";
import type { AgentInfo } from "@blackbox/shared";
import type { StoredSample, TimelineEvent } from "../src/storage/db";

process.env.BLACKBOX_INGEST_DB = ":memory:";
const { insertEvent, insertRuleEvent, insertSample, recordAgentSeen } =
  await import("../src/storage/db");
const { api } = await import("../src/api");

recordAgentSeen("api-agent", "boot-1");
insertSample({
  agentId: "api-agent",
  sequence: 1,
  kind: "memory",
  sampledAtMs: 1000,
  payload: { totalKb: 1 },
});
insertSample({
  agentId: "api-agent",
  sequence: 2,
  kind: "cpu",
  sampledAtMs: 2000,
  payload: { user: 2 },
});
insertSample({
  agentId: "api-agent",
  sequence: 3,
  kind: "memory",
  sampledAtMs: 9000,
  payload: { totalKb: 3 },
});
insertEvent({
  agentId: "api-agent",
  sequence: 4,
  kind: "lifecycle",
  sampledAtMs: 3000,
  detail: { event: "agent-crashed" },
});
insertRuleEvent({
  agentId: "api-agent",
  kind: "memory-high",
  startedAtMs: 5000,
  detail: { usedPercent: 96 },
});

test("13.1 agents route lists the known agents", async () => {
  const response = await api.request("/api/agents");
  const agents = (await response.json()) as AgentInfo[];

  expect(response.status).toBe(200);
  expect(agents.map((agent) => agent.agentId)).toContain("api-agent");
});

test("13.1 samples route returns one agent's samples in a time range", async () => {
  const response = await api.request(
    "/api/agents/api-agent/samples?fromMs=0&toMs=5000",
  );
  const samples = (await response.json()) as StoredSample[];

  expect(samples.map((sample) => sample.sequence)).toEqual([1, 2]);
});

test("13.1 samples route can filter by kind", async () => {
  const response = await api.request(
    "/api/agents/api-agent/samples?fromMs=0&toMs=10000&kind=memory",
  );
  const samples = (await response.json()) as StoredSample[];

  expect(samples.map((sample) => sample.sequence)).toEqual([1, 3]);
});

test("13.1 samples route rejects a missing time range", async () => {
  const response = await api.request("/api/agents/api-agent/samples");

  expect(response.status).toBe(400);
});

test("13.1 events route returns agent and server events, newest first", async () => {
  const response = await api.request("/api/agents/api-agent/events");
  const timeline = (await response.json()) as TimelineEvent[];

  expect(timeline.map((event) => event.kind)).toEqual([
    "memory-high",
    "lifecycle",
  ]);
  expect(timeline.map((event) => event.source)).toEqual(["server", "agent"]);
});

test("13.3 last seen follows the newest stored sample", async () => {
  recordAgentSeen("api-agent-seen", "boot-1");
  const before = (await (
    await api.request("/api/agents")
  ).json()) as AgentInfo[];

  await Bun.sleep(5);
  insertSample({
    agentId: "api-agent-seen",
    sequence: 1,
    kind: "cpu",
    sampledAtMs: 1000,
    payload: { user: 1 },
  });
  const after = (await (
    await api.request("/api/agents")
  ).json()) as AgentInfo[];

  const lastSeenBefore = before.find(
    (agent) => agent.agentId === "api-agent-seen",
  )?.lastSeenAtMs;
  const lastSeenAfter = after.find(
    (agent) => agent.agentId === "api-agent-seen",
  )?.lastSeenAtMs;

  expect(lastSeenBefore).toBeDefined();
  expect(lastSeenAfter).toBeGreaterThan(lastSeenBefore ?? 0);
});
