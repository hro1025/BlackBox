import { z } from "zod";

export const LoadAvgSchema = z.object({
  load1: z.number(),
  load5: z.number(),
  load15: z.number(),
});

export type LoadAvg = z.infer<typeof LoadAvgSchema>;
