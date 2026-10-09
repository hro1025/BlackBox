const SKEW_LIMIT_MS = 60 * 1000;
const SKEW_CLEAR_MS = 30 * 1000;

export type SkewCheck = {
  raise: boolean;
  clear: boolean;
  aheadMs: number;
};

const skewedAgents = new Set<string>();

export function checkSkew(
  agentId: string,
  sampledAtMs: number,
  receivedAtMs: number,
): SkewCheck {
  const aheadMs = sampledAtMs - receivedAtMs;
  const wasSkewed = skewedAgents.has(agentId);

  if (!wasSkewed && aheadMs > SKEW_LIMIT_MS) {
    skewedAgents.add(agentId);
    return { raise: true, clear: false, aheadMs };
  }

  if (wasSkewed && Math.abs(aheadMs) < SKEW_CLEAR_MS) {
    skewedAgents.delete(agentId);
    return { raise: false, clear: true, aheadMs };
  }

  return { raise: false, clear: false, aheadMs };
}
