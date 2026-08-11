CREATE TABLE `nutrition_references` (
	`lookup_key` text PRIMARY KEY NOT NULL,
	`ingredient_name` text NOT NULL,
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`source` text NOT NULL,
	`source_url` text NOT NULL,
	`updated_at` text NOT NULL
);
