import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { nutritionReferences } from "@/db/schema";
import type { NutritionCache } from "@/lib/nutrition";

function lookupKey(name: string) {
  return name.toLowerCase().replace(/[\s，,、·()（）\[\]]+/g, "").slice(0, 100);
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function isStructuredUsdaReference(source: string, sourceUrl: string) {
  try {
    return source.startsWith("USDA FoodData Central") && new URL(sourceUrl).hostname === "fdc.nal.usda.gov";
  } catch {
    return false;
  }
}

export const nutritionCache: NutritionCache = {
  async get(keys, ingredientName, grams) {
    const db = getDb();
    for (const name of keys) {
      const key = lookupKey(name);
      if (!key) continue;
      const [row] = await db.select().from(nutritionReferences).where(eq(nutritionReferences.lookupKey, key)).limit(1);
      if (!row) continue;
      if (!isStructuredUsdaReference(row.source, row.sourceUrl)) continue;
      const factor = grams / 100;
      return {
        ingredientName,
        calories: round(row.calories * factor),
        protein: round(row.protein * factor),
        carbs: round(row.carbs * factor),
        fat: round(row.fat * factor),
        fiber: round(row.fiber * factor),
        sugar: round(row.sugar * factor),
        saturatedFat: round(row.saturatedFat * factor),
        sodium: round(row.sodium * factor),
        caffeine: round(row.caffeine * factor),
        matched: true,
        nutritionSource: row.source,
        nutritionSourceUrl: row.sourceUrl,
      };
    }
    return null;
  },
  async set(name, match, grams) {
    const key = lookupKey(name);
    if (!key || grams <= 0 || !match.nutritionSourceUrl) return;
    const factor = 100 / grams;
    const values = {
      lookupKey: key,
      ingredientName: name.slice(0, 100),
      calories: match.calories * factor,
      protein: match.protein * factor,
      carbs: match.carbs * factor,
      fat: match.fat * factor,
      fiber: match.fiber * factor,
      sugar: match.sugar * factor,
      saturatedFat: match.saturatedFat * factor,
      sodium: match.sodium * factor,
      caffeine: match.caffeine * factor,
      source: match.nutritionSource.slice(0, 240),
      sourceUrl: match.nutritionSourceUrl.slice(0, 500),
      updatedAt: new Date().toISOString(),
    };
    await getDb().insert(nutritionReferences).values(values).onConflictDoUpdate({
      target: nutritionReferences.lookupKey,
      set: values,
    });
  },
};
