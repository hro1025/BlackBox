import { MemoryStatsSchema, memoryUsedPercent } from "@blackbox/shared";
import { evaluateThreshold, INITIAL_THRESHOLD_STATE } from "./threshold";
import type { ThresholdState } from "./threshold";

const DEFAULT_THRESHOLD_PERCENT = 95;
const DURATION_MS = 30 * 1000;
const CLEAR_MARGIN_PERCENT = 5;

function readThresholdPercent(): number {
  const raw = process.env.BLACKBOX_MEMORY_THRESHOLD;
  if (raw === undefined) {
    return DEFAULT_THRESHOLD_PERCENT;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error(
      `BLACKBOX_MEMORY_THRESHOLD must be above 0 and at most 100, got "${raw}"`,
    );
  }

  return value;
}

const THRESHOLD_PERCENT = readThresholdPercent();

const states = new Map<string, ThresholdState>();

export type MemoryCheck = {
  raise: boolean;
  clear: boolean;
  usedPercent: number;
};

export function checkMemory(
  agentId: string,
  sampledAtMs: number,
  data: unknown,
): MemoryCheck {
  const stats = MemoryStatsSchema.parse(data);
  const usedPercent = memoryUsedPercent(stats);

  const previous = states.get(agentId) ?? INITIAL_THRESHOLD_STATE;
  const result = evaluateThreshold(
    previous,
    usedPercent,
    sampledAtMs,
    THRESHOLD_PERCENT,
    DURATION_MS,
    THRESHOLD_PERCENT - CLEAR_MARGIN_PERCENT,
  );
  states.set(agentId, result.state);

  return { raise: result.raise, clear: result.clear, usedPercent };
}
