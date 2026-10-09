import { z } from "zod";

export const AgentInfoSchema = z.object({
  agentId: z.string(),
  firstSeenAtMs: z.number(),
  lastSeenAtMs: z.number(),
  lastBootId: z.string(),
});

export const AgentListSchema = z.array(AgentInfoSchema);

export type AgentInfo = z.infer<typeof AgentInfoSchema>;

export const MetricSchema = z.enum([
  "memory",
  "cpu",
  "load",
  "network",
  "temperature",
]);

export type Metric = z.infer<typeof MetricSchema>;

export const SeriesPointSchema = z.object({
  atMs: z.number(),
  value: z.number(),
});

export const SeriesSchema = z.array(SeriesPointSchema);

export type SeriesPoint = z.infer<typeof SeriesPointSchema>;

export const LivePointSchema = z.object({
  type: z.literal("point"),
  agentId: z.string(),
  metric: MetricSchema,
  atMs: z.number(),
  value: z.number(),
});

export type LivePoint = z.infer<typeof LivePointSchema>;

export const TimelineEventSchema = z.object({
  source: z.enum(["agent", "server"]),
  kind: z.string(),
  startedAtMs: z.number(),
  endedAtMs: z.number().optional(),
  detail: z.unknown(),
});

export const TimelineSchema = z.array(TimelineEventSchema);

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
