import { z } from "zod";

export const MemoryStatsSchema = z.object({
  totalKb: z.number(),
  availableKb: z.number(),
  freeKb: z.number(),
  swapTotalKb: z.number(),
  swapFreeKb: z.number(),
});

export type MemoryStats = z.infer<typeof MemoryStatsSchema>;
