import { z } from "zod";

export const NetInterfaceSchema = z.object({
  name: z.string(),
  bytesIn: z.number(),
  bytesOut: z.number(),
});

export const NetSampleSchema = z.object({
  interfaces: z.array(NetInterfaceSchema),
  sampledAtMs: z.number(),
});

export type NetInterface = z.infer<typeof NetInterfaceSchema>;
export type NetSample = z.infer<typeof NetSampleSchema>;
