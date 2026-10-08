const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const MAX_JITTER_MS = 1000;

export function reconnectDelayMs(attempt: number, random: number): number {
  const backoff = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  const jitter = random * MAX_JITTER_MS;

  return backoff + jitter;
}
