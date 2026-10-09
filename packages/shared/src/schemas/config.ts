import { z } from "zod";

export const AgentConfigSchema = z.object({
  serverUrl: z.string().min(1),
  agentId: z.string().min(1),
  tokenPath: z.string().min(1),
  sampleIntervalMs: z.number().int().min(100),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
