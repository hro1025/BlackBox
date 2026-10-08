CREATE TABLE `agents` (
	`agentId` text PRIMARY KEY NOT NULL,
	`firstSeenAtMs` integer NOT NULL,
	`lastSeenAtMs` integer NOT NULL,
	`lastBootId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`agentId` text NOT NULL,
	`sequence` integer NOT NULL,
	`kind` text NOT NULL,
	`sampledAtMs` integer NOT NULL,
	`receivedAtMs` integer NOT NULL,
	`detail` text NOT NULL,
	PRIMARY KEY(`agentId`, `sequence`)
);
--> statement-breakpoint
CREATE TABLE `samples` (
	`agentId` text NOT NULL,
	`sequence` integer NOT NULL,
	`kind` text NOT NULL,
	`sampledAtMs` integer NOT NULL,
	`receivedAtMs` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`agentId`, `sequence`)
);
