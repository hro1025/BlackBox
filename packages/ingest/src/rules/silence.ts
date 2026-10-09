const SILENCE_AFTER_MS = 15 * 1000;

type SilenceState = {
  lastHeardAtMs: number;
  silent: boolean;
};

export type SilentAgent = {
  agentId: string;
  lastHeardAtMs: number;
};

const states = new Map<string, SilenceState>();

export function noteHeard(agentId: string, nowMs: number): boolean {
  const previous = states.get(agentId);
  states.set(agentId, { lastHeardAtMs: nowMs, silent: false });

  return previous?.silent ?? false;
}

export function findNewlySilent(nowMs: number): SilentAgent[] {
  const newlySilent: SilentAgent[] = [];

  for (const [agentId, state] of states) {
    if (!state.silent && nowMs - state.lastHeardAtMs >= SILENCE_AFTER_MS) {
      states.set(agentId, { lastHeardAtMs: state.lastHeardAtMs, silent: true });
      newlySilent.push({ agentId, lastHeardAtMs: state.lastHeardAtMs });
    }
  }

  return newlySilent;
}
