/** Memory values as read from /proc/meminfo, all in kB. */
export interface MemoryStats {
  totalKb: number;
  availableKb: number;
  freeKb: number;
  swapTotalKb: number;
  swapFreeKb: number;
}

/** One memory measurement, stamped with when the agent took it. */
export type MemorySample = MemoryStats & {
  sampledAtMs: number;
};
