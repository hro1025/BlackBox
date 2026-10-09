import { expect, test } from "bun:test";
import type { SeriesPoint } from "@blackbox/shared";

process.env.BLACKBOX_INGEST_DB = ":memory:";
const { insertSample } = await import("../src/storage/db");
const { api } = await import("../src/api");

function memory(availableKb: number): unknown {
  return {
    totalKb: 1000,
    availableKb,
    freeKb: 0,
    swapTotalKb: 0,
    swapFreeKb: 0,
  };
}

insertSample({
  agentId: "series-agent",
  sequence: 1,
  kind: "memory",
  sampledAtMs: 1000,
  payload: memory(600),
});
insertSample({
  agentId: "series-agent",
  sequence: 2,
  kind: "cpu",
  sampledAtMs: 1500,
  payload: { user: 1 },
});
insertSample({
  agentId: "series-agent",
  sequence: 3,
  kind: "memory",
  sampledAtMs: 2000,
  payload: memory(250),
});
insertSample({
  agentId: "series-agent",
  sequence: 4,
  kind: "memory",
  sampledAtMs: 8000,
  payload: memory(500),
});

test("13.4 series route returns memory use in percent over time", async () => {
  const response = await api.request(
    "/api/agents/series-agent/series?metric=memory&fromMs=0&toMs=10000",
  );
  const points = (await response.json()) as SeriesPoint[];

  expect(points).toEqual([
    { atMs: 1000, value: 40 },
    { atMs: 2000, value: 75 },
    { atMs: 8000, value: 50 },
  ]);
});

test("13.4 series route thins a long series to the requested size", async () => {
  const response = await api.request(
    "/api/agents/series-agent/series?metric=memory&fromMs=0&toMs=10000&points=2",
  );
  const points = (await response.json()) as SeriesPoint[];

  expect(points).toEqual([
    { atMs: 2000, value: 75 },
    { atMs: 8000, value: 50 },
  ]);
});

test("13.4 series route rejects an unknown metric and a bad range", async () => {
  const unknown = await api.request(
    "/api/agents/series-agent/series?metric=disk&fromMs=0&toMs=10000",
  );
  const backwards = await api.request(
    "/api/agents/series-agent/series?metric=memory&fromMs=10000&toMs=0",
  );

  expect(unknown.status).toBe(400);
  expect(backwards.status).toBe(400);
});
