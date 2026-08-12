import { and, asc, count, desc, eq, gte, lte, sum } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { analyses, mealLogs } from "@/db/schema";
import { requireAppAccess } from "@/lib/access";
import { resolveProfileSettings } from "@/lib/profile";

type KitchenEnv = {
  DB?: D1Database;
  APP_TIME_ZONE?: string;
  TARGET_KCAL?: string;
  TARGET_PROTEIN?: string;
  TARGET_CARBS?: string;
  TARGET_FAT?: string;
  QUICK_LOG_ITEMS_JSON?: string;
};

const runtime = env as unknown as KitchenEnv;

function profileSettings() {
  const names = ["APP_TIME_ZONE", "TARGET_KCAL", "TARGET_PROTEIN", "TARGET_CARBS", "TARGET_FAT", "QUICK_LOG_ITEMS_JSON"] as const;
  return resolveProfileSettings(Object.fromEntries(names.map((name) => [name, runtime[name] || process.env[name]])));
}

async function ensureTables() {
  if (!runtime.DB) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, image_key TEXT, ingredient_name TEXT NOT NULL, grams REAL NOT NULL, confidence REAL NOT NULL, scale_text TEXT NOT NULL DEFAULT '', calories REAL NOT NULL DEFAULT 0, protein REAL NOT NULL DEFAULT 0, carbs REAL NOT NULL DEFAULT 0, fat REAL NOT NULL DEFAULT 0, fiber REAL NOT NULL DEFAULT 0, sugar REAL NOT NULL DEFAULT 0, saturated_fat REAL NOT NULL DEFAULT 0, sodium REAL NOT NULL DEFAULT 0, caffeine REAL NOT NULL DEFAULT 0, raw_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS nutrition_references (lookup_key TEXT PRIMARY KEY, ingredient_name TEXT NOT NULL, calories REAL NOT NULL, protein REAL NOT NULL, carbs REAL NOT NULL, fat REAL NOT NULL, fiber REAL NOT NULL DEFAULT 0, sugar REAL NOT NULL DEFAULT 0, saturated_fat REAL NOT NULL DEFAULT 0, sodium REAL NOT NULL DEFAULT 0, caffeine REAL NOT NULL DEFAULT 0, source TEXT NOT NULL, source_url TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS meal_logs (id TEXT PRIMARY KEY, meal_date TEXT NOT NULL, meal_type TEXT NOT NULL, ingredient_name TEXT NOT NULL, grams REAL NOT NULL, calories REAL NOT NULL, protein REAL NOT NULL, carbs REAL NOT NULL, fat REAL NOT NULL, fiber REAL NOT NULL DEFAULT 0, sugar REAL NOT NULL DEFAULT 0, saturated_fat REAL NOT NULL DEFAULT 0, sodium REAL NOT NULL DEFAULT 0, caffeine REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_date ON meal_logs(meal_date)`,
  ];
  await runtime.DB.batch(statements.map((sql) => runtime.DB!.prepare(sql)));
}

export async function GET(request: Request) {
  const denied = await requireAppAccess(request);
  if (denied) return denied;
  await ensureTables();

  const profile = profileSettings();
  const response: Record<string, unknown> = { ...profile };

  const db = getDb();
  const analysisRows = await db.select().from(analyses).orderBy(desc(analyses.createdAt));
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: profile.timeZone }).format(now);
  const logs = await db.select().from(mealLogs).where(and(gte(mealLogs.mealDate, date), lte(mealLogs.mealDate, date))).orderBy(desc(mealLogs.createdAt));
  const history = await db.select({
    mealDate: mealLogs.mealDate,
    entries: count(mealLogs.id),
    calories: sum(mealLogs.calories),
    protein: sum(mealLogs.protein),
    carbs: sum(mealLogs.carbs),
    fat: sum(mealLogs.fat),
    fiber: sum(mealLogs.fiber),
    sugar: sum(mealLogs.sugar),
    saturatedFat: sum(mealLogs.saturatedFat),
    sodium: sum(mealLogs.sodium),
    caffeine: sum(mealLogs.caffeine),
  }).from(mealLogs).groupBy(mealLogs.mealDate).orderBy(asc(mealLogs.mealDate));
  response.analyses = analysisRows.map((analysis) => {
    try {
      const raw = JSON.parse(analysis.rawJson) as {
        scene_type?: string;
        amount_unit?: string;
        food_name?: string;
        note?: string;
        meal_type?: string;
        nutrition_matched?: boolean;
        nutrition_source?: string;
        nutrition_source_url?: string;
        estimated_fields?: string[];
      };
      const hasNutrition = analysis.calories > 0 || analysis.protein > 0 || analysis.carbs > 0 || analysis.fat > 0;
      return {
        ...analysis,
        detectedName: raw.food_name,
        note: raw.note,
        sourceType: raw.scene_type === "package" ? "package" : raw.scene_type === "manual" ? "manual" : "ingredient",
        mealType: raw.meal_type,
        unit: raw.amount_unit === "ml" ? "ml" : "g",
        nutritionMatched: raw.nutrition_matched ?? hasNutrition,
        nutritionSource: raw.nutrition_source || (hasNutrition ? "已保存的营养数据" : "尚未匹配营养数据"),
        nutritionSourceUrl: raw.nutrition_source_url || undefined,
        estimatedFields: raw.estimated_fields || [],
      };
    } catch {
      return { ...analysis, sourceType: "ingredient", unit: "g", nutritionMatched: false, nutritionSource: "尚未匹配营养数据" };
    }
  });
  response.logs = logs;
  response.history = history.map((day) => ({ ...day, entries: Number(day.entries), calories: Number(day.calories), protein: Number(day.protein), carbs: Number(day.carbs), fat: Number(day.fat), fiber: Number(day.fiber), sugar: Number(day.sugar), saturatedFat: Number(day.saturatedFat), sodium: Number(day.sodium), caffeine: Number(day.caffeine) }));

  return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const denied = await requireAppAccess(request);
  if (denied) return denied;
  await ensureTables();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  const db = getDb();

  if (action === "saveAnalysis") {
    const id = String(body.id || crypto.randomUUID());
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "识别记录编号无效。" }, { status: 400 });
    const grams = Number(body.grams || 0);
    if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
      return Response.json({ error: "重量应在 0–10000 克之间。" }, { status: 400 });
    }
    const nutritionValues = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "saturatedFat", "sodium", "caffeine"].map((field) => Number(body[field] || 0));
    if (!nutritionValues.every((value) => Number.isFinite(value) && value >= 0 && value <= 10000)) {
      return Response.json({ error: "营养数值应为不小于 0 的有效数字。" }, { status: 400 });
    }
    const values = {
      ingredientName: String(body.ingredientName || "未命名食材").trim().slice(0, 50),
      grams,
      calories: nutritionValues[0],
      protein: nutritionValues[1],
      carbs: nutritionValues[2],
      fat: nutritionValues[3],
      fiber: nutritionValues[4],
      sugar: nutritionValues[5],
      saturatedFat: nutritionValues[6],
      sodium: nutritionValues[7],
      caffeine: nutritionValues[8],
    };
    const [existing] = await db.select({ rawJson: analyses.rawJson }).from(analyses).where(eq(analyses.id, id)).limit(1);
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(existing?.rawJson || "{}") as Record<string, unknown>; } catch { /* Start clean when old metadata is malformed. */ }
    const nutritionSource = String(body.nutritionSource || "手工修正").slice(0, 240);
    const nutritionSourceUrl = /^https:\/\//.test(String(body.nutritionSourceUrl || "")) ? String(body.nutritionSourceUrl).slice(0, 500) : "";
    const confidence = Math.max(0, Math.min(1, Number(body.confidence || 0)));
    const rawJson = JSON.stringify({
      ...raw,
      scene_type: String(body.sourceType || raw.scene_type || "ingredient").slice(0, 20),
      amount_unit: body.unit === "ml" ? "ml" : "g",
      food_name: String(body.detectedName || values.ingredientName).slice(0, 80),
      meal_type: String(body.mealType || raw.meal_type || "加餐").slice(0, 12),
      note: String(body.note || raw.note || "").slice(0, 240),
      nutrition_matched: Boolean(body.nutritionMatched),
      nutrition_source: nutritionSource,
      nutrition_source_url: nutritionSourceUrl,
      estimated_fields: nutritionSource === "手工修正" ? [] : (body.estimatedFields || raw.estimated_fields || []),
    });
    const persisted = {
      ...values,
      confidence,
      scaleText: String(body.scaleText || "").slice(0, 240),
      rawJson,
    };
    if (existing) {
      await db.update(analyses).set(persisted).where(eq(analyses.id, id));
    } else {
      await db.insert(analyses).values({ id, imageKey: "", ...persisted, createdAt: new Date().toISOString() });
    }
    return Response.json({ ok: true, id, ...values });
  }

  if (action === "logMeal") {
    const id = String(body.id || crypto.randomUUID());
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return Response.json({ error: "饮食记录编号无效。" }, { status: 400 });
    }
    const grams = Number(body.grams || 0);
    if (!Number.isFinite(grams) || grams <= 0) return Response.json({ error: "请确认食材重量。" }, { status: 400 });
    const nutrients = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "saturatedFat", "sodium", "caffeine"].map((field) => Number(body[field] || 0));
    if (!nutrients.every((value) => Number.isFinite(value) && value >= 0 && value <= 10000)) {
      return Response.json({ error: "请确认营养数值。" }, { status: 400 });
    }
    const now = new Date();
    const mealDate = new Intl.DateTimeFormat("en-CA", { timeZone: profileSettings().timeZone }).format(now);
    await db.insert(mealLogs).values({
      id,
      mealDate,
      mealType: String(body.mealType || "加餐").slice(0, 12),
      ingredientName: String(body.ingredientName || "未命名食材").slice(0, 50),
      grams,
      calories: nutrients[0],
      protein: nutrients[1],
      carbs: nutrients[2],
      fat: nutrients[3],
      fiber: nutrients[4],
      sugar: nutrients[5],
      saturatedFat: nutrients[6],
      sodium: nutrients[7],
      caffeine: nutrients[8],
      createdAt: now.toISOString(),
    }).onConflictDoNothing();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (action === "updateMeal") {
    const id = String(body.id || "");
    const ingredientName = String(body.ingredientName || "").trim().slice(0, 50);
    const grams = Number(body.grams || 0);
    const nutrients = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "saturatedFat", "sodium", "caffeine"].map((field) => Number(body[field] || 0));
    if (!id || !ingredientName) return Response.json({ error: "请填写食物名称。" }, { status: 400 });
    if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
      return Response.json({ error: "重量应在 0–10000 克之间。" }, { status: 400 });
    }
    if (!nutrients.every((value) => Number.isFinite(value) && value >= 0 && value <= 10000)) {
      return Response.json({ error: "营养数值应为不小于 0 的有效数字。" }, { status: 400 });
    }
    const [existing] = await db.select({ id: mealLogs.id }).from(mealLogs).where(eq(mealLogs.id, id)).limit(1);
    if (!existing) return Response.json({ error: "没有找到这条当天记录。" }, { status: 404 });
    await db.update(mealLogs).set({
      mealType: String(body.mealType || "加餐").trim().slice(0, 12) || "加餐",
      ingredientName,
      grams,
      calories: nutrients[0],
      protein: nutrients[1],
      carbs: nutrients[2],
      fat: nutrients[3],
      fiber: nutrients[4],
      sugar: nutrients[5],
      saturatedFat: nutrients[6],
      sodium: nutrients[7],
      caffeine: nutrients[8],
    }).where(eq(mealLogs.id, id));
    return Response.json({ ok: true, id });
  }

  if (action === "deleteMeal") {
    const id = String(body.id || "");
    const [existing] = id ? await db.select({ id: mealLogs.id }).from(mealLogs).where(eq(mealLogs.id, id)).limit(1) : [];
    if (!existing) return Response.json({ error: "没有找到这条当天记录。" }, { status: 404 });
    await db.delete(mealLogs).where(eq(mealLogs.id, id));
    return Response.json({ ok: true, id });
  }

  return Response.json({ error: "未知操作。" }, { status: 400 });
}
