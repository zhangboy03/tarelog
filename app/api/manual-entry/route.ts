import { env } from "cloudflare:workers";
import { requireAppAccess } from "@/lib/access";
import { calculateManualNutrition, parseManualEntry } from "@/lib/manual-entry";
import { resolveNutrition } from "@/lib/nutrition";
import { nutritionCache } from "@/lib/nutrition-cache";
import { resolveTimeZone } from "@/lib/profile";

type RuntimeEnv = {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  USDA_API_KEY?: string;
  APP_TIME_ZONE?: string;
};

const runtime = env as unknown as RuntimeEnv;

function runtimeValue(name: keyof RuntimeEnv) {
  return runtime[name] || process.env[name] || "";
}

export async function POST(request: Request) {
  const denied = await requireAppAccess(request);
  if (denied) return denied;
  const body = (await request.json()) as { text?: unknown };
  const parsed = parseManualEntry(String(body.text || ""), resolveTimeZone(runtimeValue("APP_TIME_ZONE")));
  if (!parsed) {
    return Response.json({ error: "请写清食物名称，以及大约重量或热量，例如“鸡腿肉 300 多卡”。" }, { status: 400 });
  }

  const reference = await resolveNutrition({
    name: parsed.name,
    grams: 100,
    apiKey: runtimeValue("AI_API_KEY"),
    baseUrl: runtimeValue("AI_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: runtimeValue("AI_MODEL") || "qwen3.7-plus",
    usdaApiKey: runtimeValue("USDA_API_KEY") || "DEMO_KEY",
    cache: nutritionCache,
  });
  const calculated = calculateManualNutrition(parsed, reference);
  if (!calculated) return Response.json({ error: reference.nutritionSource }, { status: 422 });

  const id = crypto.randomUUID();
  const nutritionSource = `${reference.nutritionSource}${parsed.targetCalories && !parsed.grams ? ` · 按约 ${parsed.targetCalories} 千卡反推重量` : ` · 按 ${calculated.grams} 克换算`}`;
  const result = {
    id,
    ingredientName: parsed.name,
    detectedName: parsed.name,
    grams: calculated.grams,
    unit: "g" as const,
    sourceType: "manual" as const,
    mealType: parsed.mealType,
    confidence: .9,
    scaleText: parsed.originalText,
    note: calculated.note,
    calories: calculated.calories,
    protein: calculated.protein,
    carbs: calculated.carbs,
    fat: calculated.fat,
    fiber: calculated.fiber,
    sugar: calculated.sugar,
    saturatedFat: calculated.saturatedFat,
    sodium: calculated.sodium,
    caffeine: calculated.caffeine,
    nutritionMatched: true,
    nutritionSource,
    nutritionSourceUrl: reference.nutritionSourceUrl,
    estimatedFields: calculated.estimatedFields,
  };
  return Response.json({ analysis: result });
}
