CREATE TABLE `match_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`player_id` text,
	`set_number` integer NOT NULL,
	`action_type` text NOT NULL,
	`quality` integer NOT NULL,
	`score_change` integer DEFAULT 0,
	`timestamp` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`opponent_name` text NOT NULL,
	`date` text NOT NULL,
	`location` text,
	`our_score` integer DEFAULT 0,
	`opponent_score` integer DEFAULT 0,
	`is_finished` integer DEFAULT false,
	`created_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`surname` text,
	`number` integer NOT NULL,
	`position` text NOT NULL,
	`cpf` text,
	`rg` text,
	`birthday` text,
	`height` real,
	`created_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
