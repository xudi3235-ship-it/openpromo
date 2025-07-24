CREATE TABLE `stripe` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`customer_id` varchar(255),
	`subscription_id` varchar(255),
	`subscription_item_id` varchar(255),
	`price_id` varchar(255),
	`coupon_id` varchar(255),
	`standing` enum('good','overdue'),
	`time_trial_ended` timestamp,
	CONSTRAINT `stripe_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `workspaceID` UNIQUE(`workspace_id`)
);
--> statement-breakpoint
CREATE TABLE `content_publishing` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`content_id` char(30) NOT NULL,
	`placement_spec` json,
	`placement` enum('IG_FEED','IG_STORY','IG_REEL','FB_FEED','FB_STORY','FB_REEL','TT_FEED','TT_STORY') NOT NULL,
	`status` enum('DRAFT','SCHEDULED','PUBLISHED','FAILED_TO_PUBLISH','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
	`scheduled_publish_at` timestamp,
	CONSTRAINT `content_publishing_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `content` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`base_spec` json,
	CONSTRAINT `content_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `content_id_unique` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`name` varchar(255),
	`email` varchar(255) NOT NULL,
	`stripe_customer_id` varchar(255) NOT NULL,
	`email_octopus_id` text,
	`flags` json DEFAULT ('{}'),
	CONSTRAINT `user_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `user_stripe_customer_id_unique` UNIQUE(`stripe_customer_id`),
	CONSTRAINT `email` UNIQUE(`workspace_id`,`email`)
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
ALTER TABLE `content_publishing` ADD CONSTRAINT `content_publishing_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_publishing` ADD CONSTRAINT `fk_content_publishing_content` FOREIGN KEY (`workspace_id`,`content_id`) REFERENCES `content`(`workspace_id`,`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content` ADD CONSTRAINT `content_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `id_idx` ON `content_publishing` (`id`);--> statement-breakpoint
CREATE INDEX `id_idx` ON `content` (`id`);