import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  agentId: text().primaryKey(),
  firstSeenAtMs: integer().notNull(),
  lastSeenAtMs: integer().notNull(),
  lastBootId: text().notNull(),
});

export const samples = sqliteTable(
  "samples",
  {
    agentId: text().notNull(),
    sequence: integer().notNull(),
    kind: text().notNull(),
    sampledAtMs: integer().notNull(),
    receivedAtMs: integer().notNull(),
    payload: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.agentId, table.sequence] }),
    index("samples_agent_time_idx").on(table.agentId, table.sampledAtMs),
  ],
);

export const events = sqliteTable(
  "events",
  {
    agentId: text().notNull(),
    sequence: integer().notNull(),
    kind: text().notNull(),
    sampledAtMs: integer().notNull(),
    receivedAtMs: integer().notNull(),
    detail: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.agentId, table.sequence] })],
);

export const ruleEvents = sqliteTable("ruleEvents", {
  id: integer().primaryKey({ autoIncrement: true }),
  agentId: text().notNull(),
  kind: text().notNull(),
  startedAtMs: integer().notNull(),
  endedAtMs: integer(),
  detail: text().notNull(),
});
