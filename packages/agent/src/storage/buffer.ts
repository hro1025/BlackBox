import { deleteSamplesOlderThan, insertSamples } from "./db";

const RETENTION_MS = 24 * 60 * 60 * 1000;

export type BufferedSample = {
  kind: string;
  sampledAtMs: number;
  payload: unknown;
};

let batch: BufferedSample[] = [];

export function addSample(sample: BufferedSample): void {
  batch.push(sample);
}

export function flush(): void {
  const toWrite = batch;
  batch = [];

  if (toWrite.length === 0) {
    return;
  }

  try {
    insertSamples(toWrite);
    deleteSamplesOlderThan(Date.now() - RETENTION_MS);
    console.log(`Wrote ${toWrite.length} samples`);
  } catch (error) {
    batch = toWrite.concat(batch);
    if (error instanceof Error) {
      console.error(`Failed to write samples: ${error.message}`);
    } else {
      console.error("Failed to write samples:", error);
    }
  }
}
