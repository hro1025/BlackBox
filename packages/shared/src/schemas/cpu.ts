import { z } from "zod";

export const CpuTimesSchema = z.object({
  user: z.number(),
  nice: z.number(),
  system: z.number(),
  idle: z.number(),
  iowait: z.number(),
  irq: z.number(),
  softirq: z.number(),
  steal: z.number(),
});

export type CpuTimes = z.infer<typeof CpuTimesSchema>;
