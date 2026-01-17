CREATE TABLE `buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` integer NOT NULL,
	`name` text NOT NULL,
	`cdn_base_url` text,
	`endpoint_url` text NOT NULL,
	`region` text DEFAULT 'auto' NOT NULL,
	`access_key_id` text NOT NULL,
	`secret_access_key` text NOT NULL,
	`bucket_name` text NOT NULL,
	`force_path_style` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_buckets_owner_user_id` ON `buckets` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `idx_buckets_owner_name` ON `buckets` (`owner_user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_buckets_created_at` ON `buckets` (`created_at`);--> statement-breakpoint
CREATE TABLE `path_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`bucket_id` text NOT NULL,
	`path` text NOT NULL,
	`is_public` integer DEFAULT 0 NOT NULL,
	`tags` text,
	`password_hash` text,
	`extra_metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_path_metadata_bucket_path` ON `path_metadata` (`bucket_id`,`path`);--> statement-breakpoint
CREATE INDEX `idx_path_metadata_bucket_public` ON `path_metadata` (`bucket_id`,`is_public`);--> statement-breakpoint
CREATE INDEX `idx_path_metadata_bucket_updated` ON `path_metadata` (`bucket_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`login_xff` text,
	`login_ua` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_token_hash` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires_at` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_expires` ON `sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `upload_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`bucket_id` text NOT NULL,
	`object_key` text NOT NULL,
	`object_size` integer NOT NULL,
	`content_type` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_upload_history_user_created` ON `upload_history` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_upload_history_bucket_created` ON `upload_history` (`bucket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_upload_history_bucket_object_key` ON `upload_history` (`bucket_id`,`object_key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`authorization_level` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);