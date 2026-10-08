import { deleteSamplesOlderThan } from "./storage/db";

const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RETENTION_MS = Number(
  process.env.BLACKBOX_RETENTION_MS ?? DEFAULT_RETENTION_MS,
);

export function runRetention(): void {
  try {
    const deleted = deleteSamplesOlderThan(Date.now() - RETENTION_MS);

    if (deleted > 0) {
      console.log(`retention deleted ${deleted} samples`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to run retention: ${error.message}`);
    } else {
      console.error("Failed to run retention:", error);
    }
  }
}
