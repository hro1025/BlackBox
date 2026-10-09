import { Database } from "bun:sqlite";
import type { AgentInfo } from "@blackbox/shared";
import { and, asc, count, desc, eq, gte, isNull, lt, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { agents, events, ruleEvents, samples } from "./schema";

const DB_PATH =
  process.env.BLACKBOX_INGEST_DB ?? `${import.meta.dir}/ingest.db`;
const MIGRATIONS_PATH = `${import.meta.dir}/../../drizzle`;

const sqlite = new Database(DB_PATH);
sqlite.run("PRAGMA journal_mode = WAL;");

const db = drizzle({ client: sqlite });
migrate(db, { migrationsFolder: MIGRATIONS_PATH });

export type ReceivedSample = {
  agentId: string;
  sequence: number;
  kind: string;
  sampledAtMs: number;
  payload: unknown;
};

export type ReceivedEvent = {
  agentId: string;
  sequence: number;
  kind: string;
  sampledAtMs: number;
  detail: unknown;
};

export type StoredSample = {
  sequence: number;
  kind: string;
  sampledAtMs: number;
  payload: unknown;
};

export type TimelineEvent = {
  source: "agent" | "server";
  kind: string;
  startedAtMs: number;
  endedAtMs: number | undefined;
  detail: unknown;
};

export type RaisedRuleEvent = {
  agentId: string;
  kind: string;
  startedAtMs: number;
  detail: unknown;
};

export function recordAgentSeen(agentId: string, bootId: string): void {
  const nowMs = Date.now();

  db.insert(agents)
    .values({
      agentId: agentId,
      firstSeenAtMs: nowMs,
      lastSeenAtMs: nowMs,
      lastBootId: bootId,
    })
    .onConflictDoUpdate({
      target: agents.agentId,
      set: { lastSeenAtMs: nowMs, lastBootId: bootId },
    })
    .run();
}

export function insertSample(sample: ReceivedSample): boolean {
  const inserted = db
    .insert(samples)
    .values({
      agentId: sample.agentId,
      sequence: sample.sequence,
      kind: sample.kind,
      sampledAtMs: sample.sampledAtMs,
      receivedAtMs: Date.now(),
      payload: JSON.stringify(sample.payload),
    })
    .onConflictDoNothing()
    .returning({ sequence: samples.sequence })
    .all();

  return inserted.length === 1;
}

export function insertEvent(event: ReceivedEvent): boolean {
  const inserted = db
    .insert(events)
    .values({
      agentId: event.agentId,
      sequence: event.sequence,
      kind: event.kind,
      sampledAtMs: event.sampledAtMs,
      receivedAtMs: Date.now(),
      detail: JSON.stringify(event.detail),
    })
    .onConflictDoNothing()
    .returning({ sequence: events.sequence })
    .all();

  return inserted.length === 1;
}

export function insertRuleEvent(event: RaisedRuleEvent): number {
  const inserted = db
    .insert(ruleEvents)
    .values({
      agentId: event.agentId,
      kind: event.kind,
      startedAtMs: event.startedAtMs,
      detail: JSON.stringify(event.detail),
    })
    .returning({ id: ruleEvents.id })
    .get();

  return inserted.id;
}

export function endRuleEvent(
  agentId: string,
  kind: string,
  endedAtMs: number,
): number {
  const ended = db
    .update(ruleEvents)
    .set({ endedAtMs: endedAtMs })
    .where(
      and(
        eq(ruleEvents.agentId, agentId),
        eq(ruleEvents.kind, kind),
        isNull(ruleEvents.endedAtMs),
      ),
    )
    .returning({ id: ruleEvents.id })
    .all();

  return ended.length;
}

export function closeOpenRuleEvents(endedAtMs: number): number {
  const ended = db
    .update(ruleEvents)
    .set({ endedAtMs: endedAtMs })
    .where(isNull(ruleEvents.endedAtMs))
    .returning({ id: ruleEvents.id })
    .all();

  return ended.length;
}

export function readLastSequence(agentId: string): number {
  const sampleRow = db
    .select({ lastSequence: max(samples.sequence) })
    .from(samples)
    .where(eq(samples.agentId, agentId))
    .get();

  const eventRow = db
    .select({ lastSequence: max(events.sequence) })
    .from(events)
    .where(eq(events.agentId, agentId))
    .get();

  return Math.max(sampleRow?.lastSequence ?? 0, eventRow?.lastSequence ?? 0);
}

export function readSamplesBetween(
  agentId: string,
  fromMs: number,
  toMs: number,
  kind?: string,
): StoredSample[] {
  const conditions = [
    eq(samples.agentId, agentId),
    gte(samples.sampledAtMs, fromMs),
    lt(samples.sampledAtMs, toMs),
  ];
  if (kind !== undefined) {
    conditions.push(eq(samples.kind, kind));
  }

  const rows = db
    .select({
      sequence: samples.sequence,
      kind: samples.kind,
      sampledAtMs: samples.sampledAtMs,
      payload: samples.payload,
    })
    .from(samples)
    .where(and(...conditions))
    .orderBy(asc(samples.sampledAtMs))
    .all();

  return rows.map((row) => ({
    sequence: row.sequence,
    kind: row.kind,
    sampledAtMs: row.sampledAtMs,
    payload: JSON.parse(row.payload) as unknown,
  }));
}

function readLastReceivedAtMs(agentId: string): number {
  const sampleRow = db
    .select({ receivedAtMs: samples.receivedAtMs })
    .from(samples)
    .where(eq(samples.agentId, agentId))
    .orderBy(desc(samples.sequence))
    .limit(1)
    .get();

  const eventRow = db
    .select({ receivedAtMs: events.receivedAtMs })
    .from(events)
    .where(eq(events.agentId, agentId))
    .orderBy(desc(events.sequence))
    .limit(1)
    .get();

  return Math.max(sampleRow?.receivedAtMs ?? 0, eventRow?.receivedAtMs ?? 0);
}

export function readAgents(): AgentInfo[] {
  const rows = db.select().from(agents).orderBy(asc(agents.agentId)).all();

  return rows.map((row) => ({
    agentId: row.agentId,
    firstSeenAtMs: row.firstSeenAtMs,
    lastSeenAtMs: Math.max(row.lastSeenAtMs, readLastReceivedAtMs(row.agentId)),
    lastBootId: row.lastBootId,
  }));
}

export function readTimeline(agentId: string): TimelineEvent[] {
  const agentRows = db
    .select()
    .from(events)
    .where(eq(events.agentId, agentId))
    .orderBy(desc(events.sampledAtMs))
    .all();

  const ruleRows = db
    .select()
    .from(ruleEvents)
    .where(eq(ruleEvents.agentId, agentId))
    .orderBy(desc(ruleEvents.startedAtMs))
    .all();

  const timeline: TimelineEvent[] = [];

  for (const row of agentRows) {
    timeline.push({
      source: "agent",
      kind: row.kind,
      startedAtMs: row.sampledAtMs,
      endedAtMs: undefined,
      detail: JSON.parse(row.detail) as unknown,
    });
  }

  for (const row of ruleRows) {
    timeline.push({
      source: "server",
      kind: row.kind,
      startedAtMs: row.startedAtMs,
      endedAtMs: row.endedAtMs ?? undefined,
      detail: JSON.parse(row.detail) as unknown,
    });
  }

  return timeline.sort((a, b) => b.startedAtMs - a.startedAtMs);
}

export function deleteSamplesOlderThan(cutoffMs: number): number {
  const deleted = db
    .delete(samples)
    .where(lt(samples.receivedAtMs, cutoffMs))
    .returning({ sequence: samples.sequence })
    .all();

  return deleted.length;
}

export function countSamples(agentId: string): number {
  const row = db
    .select({ total: count() })
    .from(samples)
    .where(eq(samples.agentId, agentId))
    .get();

  return row?.total ?? 0;
}

export function countEvents(agentId: string): number {
  const row = db
    .select({ total: count() })
    .from(events)
    .where(eq(events.agentId, agentId))
    .get();

  return row?.total ?? 0;
}

export function countRuleEvents(agentId: string): number {
  const row = db
    .select({ total: count() })
    .from(ruleEvents)
    .where(eq(ruleEvents.agentId, agentId))
    .get();

  return row?.total ?? 0;
}
