CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_site_settings_updated_at` ON `site_settings` (`updated_at`);