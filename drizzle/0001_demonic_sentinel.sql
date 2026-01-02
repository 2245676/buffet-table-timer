CREATE TABLE `dining_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` int NOT NULL,
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`actualEndTime` bigint,
	`bufferEndTime` bigint,
	`extensionCount` int NOT NULL DEFAULT 0,
	`totalExtensionMinutes` int NOT NULL DEFAULT 0,
	`isCompleted` int NOT NULL DEFAULT 0,
	`remarks` text,
	`lastAlertTime` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dining_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableNumber` varchar(20) NOT NULL,
	`maxCapacity` int NOT NULL DEFAULT 4,
	`defaultDuration` int NOT NULL DEFAULT 90,
	`bufferDuration` int NOT NULL DEFAULT 15,
	`status` enum('idle','dining','warning','timeout','buffer','disabled') NOT NULL DEFAULT 'idle',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tables_id` PRIMARY KEY(`id`),
	CONSTRAINT `tables_tableNumber_unique` UNIQUE(`tableNumber`)
);
