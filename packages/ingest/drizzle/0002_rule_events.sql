CREATE TABLE `ruleEvents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agentId` text NOT NULL,
	`kind` text NOT NULL,
	`startedAtMs` integer NOT NULL,
	`endedAtMs` integer,
	`detail` text NOT NULL
);
