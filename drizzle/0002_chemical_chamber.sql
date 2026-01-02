CREATE TABLE `email_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`notifyOnTimeout` int NOT NULL DEFAULT 1,
	`notificationInterval` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_notification_settings_userId_unique` UNIQUE(`userId`)
);
