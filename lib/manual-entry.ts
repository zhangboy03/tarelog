import type { NutritionMatch } from "@/lib/nutrition";

export type ParsedManualEntry = {
  name: string;
  grams?: number;
  targetCalories?: number;
  mealType: string;
  originalText: string;
};

const amountPattern = /(\d+(?:\.\d+)?)\s*(?:多|来|余|左右|上下|约)?\s*(千卡|大卡|卡路里|kcal|卡|公斤|千克|kg|克|g)/gi;

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function inferMealType(text: string, timeZone: string) {
  if (/早餐|早饭/.test(text)) return "早餐";
  if (/午餐|午饭/.test(text)) return "午餐";
  if (/晚餐|晚饭/.test(text)) return "晚餐";
  if (/夜宵/.test(text)) return "夜宵";
  if (/加餐|零食/.test(text)) return "加餐";
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 10) return "早餐";
  if (hour < 15) return "午餐";
  if (hour < 22) return "晚餐";
  return "加餐";
}

export function parseManualEntry(input: string, timeZone = "UTC"): ParsedManualEntry | null {
  const originalText = input.trim().slice(0, 160);
  if (!originalText) return null;
  const amounts = [...originalText.matchAll(amountPattern)];
  let grams: number | undefined;
  let targetCalories: number | undefined;
  for (const match of amounts) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value) || value <= 0) continue;
    if (["克", "g", "公斤", "千克", "kg"].includes(unit) && grams === undefined) {
      grams = ["公斤", "千克", "kg"].includes(unit) ? value * 1000 : value;
    }
    if (["千卡", "大卡", "卡路里", "kcal", "卡"].includes(unit) && targetCalories === undefined) {
      targetCalories = value;
    }
  }
  const name = originalText
    .replace(amountPattern, " ")
    .replace(/早餐|早饭|午餐|午饭|晚餐|晚饭|夜宵|加餐|零食/g, " ")
    .replace(/今天|刚才|我|吃了|吃的|吃|大概|大约|差不多|帮我|记一下|记录|补记|左右/g, " ")
    .replace(/[，。；、,.;:：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || (!grams && !targetCalories)) return null;
  if ((grams || 0) > 10000 || (targetCalories || 0) > 10000) return null;
  return {
    name: name.slice(0, 50),
    ...(grams ? { grams } : {}),
    ...(targetCalories ? { targetCalories } : {}),
    mealType: inferMealType(originalText, timeZone),
    originalText,
  };
}

export function calculateManualNutrition(parsed: ParsedManualEntry, per100g: NutritionMatch) {
  if (!per100g.matched || per100g.calories <= 0) return null;
  const factor = parsed.grams ? parsed.grams / 100 : Number(parsed.targetCalories) / per100g.calories;
  const grams = round(parsed.grams || factor * 100);
  const targetCalories = parsed.targetCalories && !parsed.grams ? parsed.targetCalories : null;
  const nutrition = {
    ingredientName: parsed.name,
    grams,
    calories: round(targetCalories || per100g.calories * factor),
    protein: round(per100g.protein * factor),
    carbs: round(per100g.carbs * factor),
    fat: round(per100g.fat * factor),
    fiber: round(per100g.fiber * factor),
    sugar: round(per100g.sugar * factor),
    saturatedFat: round(per100g.saturatedFat * factor),
    sodium: round(per100g.sodium * factor),
    caffeine: round(per100g.caffeine * factor),
  };
  return {
    ...nutrition,
    note: targetCalories
      ? `按你写的约 ${round(targetCalories)} 千卡反推为约 ${grams} 克，请保存前确认。`
      : `按你写的 ${grams} 克估算营养，请保存前确认。`,
    estimatedFields: targetCalories
      ? ["重量", "蛋白质", "碳水", "脂肪", "膳食纤维", "糖", "饱和脂肪", "钠", "咖啡因"]
      : ["热量", "蛋白质", "碳水", "脂肪", "膳食纤维", "糖", "饱和脂肪", "钠", "咖啡因"],
  };
}
