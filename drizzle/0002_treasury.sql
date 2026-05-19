CREATE TABLE `monthly_fee_config` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`valor_base` real NOT NULL,
	`valor_juros_por_dia` real NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`atleta_id` text NOT NULL,
	`team_id` text NOT NULL,
	`mes_referencia` text NOT NULL,
	`valor_base` real NOT NULL,
	`valor_solidario` real NOT NULL DEFAULT 0,
	`valor_juros` real NOT NULL DEFAULT 0,
	`data_pagamento` text,
	`observacao` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`atleta_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `treasury_events` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`team_ids` text NOT NULL,
	`data_inicio` text NOT NULL,
	`data_fim` text,
	`valor_por_atleta` real NOT NULL,
	`observacao` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`atleta_id` text NOT NULL,
	`evento_id` text NOT NULL,
	`numero_parcela` integer NOT NULL,
	`total_parcelas` integer NOT NULL,
	`valor_parcela` real NOT NULL,
	`data_pagamento` text,
	`observacao` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`atleta_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evento_id`) REFERENCES `treasury_events`(`id`) ON UPDATE no action ON DELETE no action
);
