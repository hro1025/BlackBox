export type ThresholdState = {
  aboveSinceMs: number | undefined;
  raised: boolean;
};

export type ThresholdResult = {
  state: ThresholdState;
  raise: boolean;
  clear: boolean;
};

export const INITIAL_THRESHOLD_STATE: ThresholdState = {
  aboveSinceMs: undefined,
  raised: false,
};

export function evaluateThreshold(
  previous: ThresholdState,
  value: number,
  atMs: number,
  threshold: number,
  durationMs: number,
  clearBelow: number = threshold,
): ThresholdResult {
  if (previous.raised) {
    if (value < clearBelow) {
      return { state: INITIAL_THRESHOLD_STATE, raise: false, clear: true };
    }

    return { state: previous, raise: false, clear: false };
  }

  if (value <= threshold) {
    return { state: INITIAL_THRESHOLD_STATE, raise: false, clear: false };
  }

  const aboveSinceMs = previous.aboveSinceMs ?? atMs;
  const raise = atMs - aboveSinceMs >= durationMs;

  return {
    state: { aboveSinceMs, raised: raise },
    raise,
    clear: false,
  };
}
