CREATE TABLE `blacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guestPhone` varchar(20) NOT NULL,
	`guestName` varchar(100),
	`reason` text,
	`addedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blacklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `blacklist_guestPhone_unique` UNIQUE(`guestPhone`)
);
--> statement-breakpoint
CREATE TABLE `capacity_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodName` varchar(50) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`maxCapacity` int NOT NULL,
	`lateArrivalBuffer` int NOT NULL DEFAULT 15,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capacity_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationType` varchar(50) NOT NULL,
	`reservationId` int,
	`operatedBy` int NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationDate` varchar(10) NOT NULL,
	`reservationTime` varchar(5) NOT NULL,
	`guestName` varchar(100) NOT NULL,
	`guestPhone` varchar(20) NOT NULL,
	`partySize` int NOT NULL,
	`source` enum('phone','wechat','walk-in','platform','other') NOT NULL,
	`status` enum('pending','confirmed','arrived','completed','cancelled') NOT NULL DEFAULT 'pending',
	`remarks` text,
	`tags` text,
	`tableId` int,
	`diningSessionId` int,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`isHighRisk` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
