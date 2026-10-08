import { Database } from "bun:sqlite";
import type { BufferedSample } from "./buffer";

const DB_PATH = process.env.BLACKBOX_DB ?? `${import.meta.dir}/blackbox.db`;
const db = new Database(DB_PATH);

db.run("PRAGMA journal_mode = WAL;");

db.run(`
  CREATE TABLE IF NOT EXISTS samples (
    sequence INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,
    sampledAtMs INTEGER NOT NULL,
    payload TEXT NOT NULL
  )
`);

type StoredRow = {
  sequence: number;
  kind: string;
  sampledAtMs: number;
  payload: string;
};

type LastSequenceRow = {
  lastSequence: number | null;
};

export type StoredSample = BufferedSample & {
  sequence: number;
};

const insertSample = db.prepare(
  "INSERT INTO samples (kind, sampledAtMs, payload) VALUES (?, ?, ?)",
);

const deleteOldSamples = db.prepare(
  "DELETE FROM samples WHERE sampledAtMs < ?",
);

const selectSamplesAfter = db.prepare<StoredRow, [number, number]>(
  "SELECT sequence, kind, sampledAtMs, payload FROM samples WHERE sequence > ? ORDER BY sequence LIMIT ?",
);

const selectLastSequence = db.prepare<LastSequenceRow, []>(
  "SELECT MAX(sequence) AS lastSequence FROM samples",
);

export const insertSamples = db.transaction((samples: BufferedSample[]) => {
  for (const sample of samples) {
    insertSample.run(
      sample.kind,
      sample.sampledAtMs,
      JSON.stringify(sample.payload),
    );
  }
});

export function deleteSamplesOlderThan(cutoffMs: number): void {
  deleteOldSamples.run(cutoffMs);
}

export function readSamplesAfter(
  afterSequence: number,
  limit: number,
): StoredSample[] {
  const rows = selectSamplesAfter.all(afterSequence, limit);

  return rows.map((row) => ({
    sequence: row.sequence,
    kind: row.kind,
    sampledAtMs: row.sampledAtMs,
    payload: JSON.parse(row.payload) as unknown,
  }));
}

export function readLastSequence(): number {
  const row = selectLastSequence.get();

  if (row === null || row.lastSequence === null) {
    return 0;
  }

  return row.lastSequence;
}
