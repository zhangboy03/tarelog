import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analyses = sqliteTable("analyses", {
  id: text("id").primaryKey(),
  imageKey: text("image_key"),
  ingredientName: text("ingredient_name").notNull(),
  grams: real("grams").notNull(),
  confidence: real("confidence").notNull(),
  scaleText: text("scale_text").notNull().default(""),
  calories: real("calories").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  fiber: real("fiber").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  saturatedFat: real("saturated_fat").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  caffeine: real("caffeine").notNull().default(0),
  rawJson: text("raw_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const nutritionReferences = sqliteTable("nutrition_references", {
  lookupKey: text("lookup_key").primaryKey(),
  ingredientName: text("ingredient_name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  saturatedFat: real("saturated_fat").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  caffeine: real("caffeine").notNull().default(0),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mealLogs = sqliteTable("meal_logs", {
  id: text("id").primaryKey(),
  mealDate: text("meal_date").notNull(),
  mealType: text("meal_type").notNull(),
  ingredientName: text("ingredient_name").notNull(),
  grams: real("grams").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  saturatedFat: real("saturated_fat").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  caffeine: real("caffeine").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_meal_logs_meal_date").on(table.mealDate)]);

export const healthSyncs = sqliteTable("health_syncs", {
  mealLogId: text("meal_log_id").primaryKey(),
  mealDate: text("meal_date").notNull(),
  syncedAt: text("synced_at").notNull(),
});
