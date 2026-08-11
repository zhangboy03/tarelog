CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`image_key` text,
	`ingredient_name` text NOT NULL,
	`grams` real NOT NULL,
	`confidence` real NOT NULL,
	`scale_text` text DEFAULT '' NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`protein` real DEFAULT 0 NOT NULL,
	`carbs` real DEFAULT 0 NOT NULL,
	`fat` real DEFAULT 0 NOT NULL,
	`raw_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_date` text NOT NULL,
	`meal_type` text NOT NULL,
	`ingredient_name` text NOT NULL,
	`grams` real NOT NULL,
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
