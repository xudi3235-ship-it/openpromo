CREATE TABLE `connected_account` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`platform` varchar(50) NOT NULL,
	`external_account_id` varchar(255) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
	`encrypted_access_token` text NOT NULL,
	`refresh_token` text,
	`scopes` json DEFAULT ('[]'),
	`metadata` json NOT NULL,
	CONSTRAINT `connected_account_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `pending_content_group` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`base_spec` json,
	CONSTRAINT `pending_content_group_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `content_id_unique` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `unified_content` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`connected_account_id` char(30) NOT NULL,
	`pending_content_group_id` char(30),
	`source_content` json,
	`placement_spec` json,
	`placement` enum('IG_FEED','IG_STORY','IG_REEL','FB_FEED','FB_STORY','FB_REEL','TT_FEED','TT_STORY') NOT NULL,
	`status` enum('DRAFT','SCHEDULED','PUBLISHED','FAILED_TO_PUBLISH','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
	`scheduled_publish_at` timestamp(3),
	`schedule_name` varchar(255),
	CONSTRAINT `unified_content_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`customer_id` varchar(255),
	`subscription_id` varchar(255),
	`subscription_item_id` varchar(255),
	`status` enum('active','canceled','incomplete','incomplete_expired','past_due','paused','trialing','unpaid') NOT NULL,
	`price_id` varchar(255),
	`coupon_id` varchar(255),
	`time_trial_ended` timestamp,
	CONSTRAINT `subscription_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `workspaceID` UNIQUE(`workspace_id`)
);
--> statement-breakpoint
CREATE TABLE `user_workspace` (
	`id` char(30) NOT NULL,
	`user_id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`role_id` varchar(255) NOT NULL,
	`joined_at` timestamp(3),
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	CONSTRAINT `uk_user_workspace` UNIQUE(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`name` varchar(255),
	`email` varchar(255) NOT NULL,
	`stripe_customer_id` varchar(255) NOT NULL,
	`email_octopus_id` varchar(255) NOT NULL,
	`flags` json DEFAULT ('{}'),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`),
	CONSTRAINT `user_stripe_customer_id_unique` UNIQUE(`stripe_customer_id`),
	CONSTRAINT `user_email_octopus_id_unique` UNIQUE(`email_octopus_id`)
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`slug` varchar(255) NOT NULL,
	CONSTRAINT `workspace_id` PRIMARY KEY(`id`),
	CONSTRAINT `slug` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `connected_account` ADD CONSTRAINT `connected_account_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_content_group` ADD CONSTRAINT `pending_content_group_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unified_content` ADD CONSTRAINT `unified_content_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unified_content` ADD CONSTRAINT `unified_content_connected_account_id_connected_account_id_fk` FOREIGN KEY (`connected_account_id`) REFERENCES `connected_account`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_workspace` ADD CONSTRAINT `user_workspace_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_workspace` ADD CONSTRAINT `user_workspace_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `id_idx` ON `connected_account` (`id`);--> statement-breakpoint
CREATE INDEX `platform_idx` ON `connected_account` (`platform`);--> statement-breakpoint
CREATE INDEX `external_account_idx` ON `connected_account` (`external_account_id`);--> statement-breakpoint
CREATE INDEX `workspace_platform_idx` ON `connected_account` (`workspace_id`,`platform`);--> statement-breakpoint
CREATE INDEX `id_idx` ON `pending_content_group` (`id`);--> statement-breakpoint
CREATE INDEX `id_idx` ON `unified_content` (`id`);--> statement-breakpoint
CREATE INDEX `idx_user_primary` ON `user_workspace` (`user_id`);