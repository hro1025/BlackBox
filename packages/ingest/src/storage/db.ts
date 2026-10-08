import { Database } from "bun:sqlite";
import { and, asc, count, eq, gte, lt, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { agents, events, samples } from "./schema";

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
): StoredSample[] {
  const rows = db
    .select({
      sequence: samples.sequence,
      kind: samples.kind,
      sampledAtMs: samples.sampledAtMs,
      payload: samples.payload,
    })
    .from(samples)
    .where(
      and(
        eq(samples.agentId, agentId),
        gte(samples.sampledAtMs, fromMs),
        lt(samples.sampledAtMs, toMs),
      ),
    )
    .orderBy(asc(samples.sampledAtMs))
    .all();

  return rows.map((row) => ({
    sequence: row.sequence,
    kind: row.kind,
    sampledAtMs: row.sampledAtMs,
    payload: JSON.parse(row.payload) as unknown,
  }));
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
