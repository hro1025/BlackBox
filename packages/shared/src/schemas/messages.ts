import { z } from "zod";

export const HelloMessageSchema = z.object({
  type: z.literal("hello"),
  agentId: z.string(),
  token: z.string(),
  protocolVersion: z.number(),
  bootId: z.string(),
});

export const WelcomeMessageSchema = z.object({
  type: z.literal("welcome"),
  lastSeq: z.number(),
});

export const SampleMessageSchema = z.object({
  type: z.literal("sample"),
  seq: z.number(),
  kind: z.string(),
  sampledAtMs: z.number(),
  data: z.unknown(),
});

export const EventMessageSchema = z.object({
  type: z.literal("event"),
  seq: z.number(),
  kind: z.string(),
  sampledAtMs: z.number(),
  detail: z.unknown(),
});

export const AckMessageSchema = z.object({
  type: z.literal("ack"),
  seq: z.number(),
});

export const MessageSchema = z.discriminatedUnion("type", [
  HelloMessageSchema,
  WelcomeMessageSchema,
  SampleMessageSchema,
  EventMessageSchema,
  AckMessageSchema,
]);

export type HelloMessage = z.infer<typeof HelloMessageSchema>;
export type WelcomeMessage = z.infer<typeof WelcomeMessageSchema>;
export type SampleMessage = z.infer<typeof SampleMessageSchema>;
export type EventMessage = z.infer<typeof EventMessageSchema>;
export type AckMessage = z.infer<typeof AckMessageSchema>;
export type Message = z.infer<typeof MessageSchema>;
