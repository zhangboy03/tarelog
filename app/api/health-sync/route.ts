import { asc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { healthSyncs, mealLogs } from "@/db/schema";
import { nutrientFields, pendingHealthNutrients, type NutrientField } from "@/lib/health-sync";
import { resolveTimeZone } from "@/lib/profile";

type HealthSyncEnv = {
  DB?: D1Database;
  HEALTH_SYNC_TOKEN?: string;
  APP_TIME_ZONE?: string;
};

const runtime = env as unknown as HealthSyncEnv;

function runtimeToken() {
  const token = runtime.HEALTH_SYNC_TOKEN || process.env.HEALTH_SYNC_TOKEN || "";
  if (token.length < 24 || token.startsWith("replace-with-")) return "";
  return token;
}

function runtimeTimeZone() {
  return resolveTimeZone(runtime.APP_TIME_ZONE || process.env.APP_TIME_ZONE);
}

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

async function ensureTable() {
  if (!runtime.DB) return;
  await runtime.DB.prepare(
    "CREATE TABLE IF NOT EXISTS health_syncs (meal_log_id TEXT PRIMARY KEY, meal_date TEXT NOT NULL, synced_at TEXT NOT NULL)"
  ).run();
}

function authorize(request: Request) {
  const expected = runtimeToken();
  if (!expected) return json({ error: "Apple 健康同步尚未配置。" }, { status: 503 });
  if (request.headers.get("x-health-sync-token") !== expected) {
    return json({ error: "Apple 健康同步凭证无效。" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  await ensureTable();

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: runtimeTimeZone() }).format(new Date());
  const db = getDb();
  const rows = await db.select({
    id: mealLogs.id,
    foodName: mealLogs.ingredientName,
    date: mealLogs.createdAt,
    calories: mealLogs.calories,
    protein: mealLogs.protein,
    carbs: mealLogs.carbs,
    fat: mealLogs.fat,
    fiber: mealLogs.fiber,
    sugar: mealLogs.sugar,
    saturatedFat: mealLogs.saturatedFat,
    sodium: mealLogs.sodium,
    caffeine: mealLogs.caffeine,
  }).from(mealLogs)
    .where(eq(mealLogs.mealDate, today))
    .orderBy(asc(mealLogs.createdAt));
  const synced = await db.select({ key: healthSyncs.mealLogId }).from(healthSyncs).where(eq(healthSyncs.mealDate, today));
  const completed = new Set(synced.map(({ key }) => key));
  const pending = pendingHealthNutrients(rows, completed);
  const pendingMeals = rows.filter((row) => nutrientFields.some((field) => pending[field].some((item) => item.id === row.id))).length;

  return json({ date: today, count: pendingMeals, ...pending });
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  await ensureTable();

  const body = (await request.json()) as { action?: unknown; id?: unknown; nutrient?: unknown };
  if (body.action === "reset-today") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: runtimeTimeZone() }).format(new Date());
    const db = getDb();
    await db.delete(healthSyncs).where(eq(healthSyncs.mealDate, today));
    return json({ ok: true, date: today });
  }

  const id = String(body.id || "");
  const nutrient = String(body.nutrient || "") as NutrientField;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "记录编号无效。" }, { status: 400 });
  if (!nutrientFields.includes(nutrient)) return json({ error: "营养项目无效。" }, { status: 400 });

  const db = getDb();
  const [meal] = await db.select({ mealDate: mealLogs.mealDate }).from(mealLogs).where(eq(mealLogs.id, id)).limit(1);
  if (!meal) return json({ error: "没有找到这条饮食记录。" }, { status: 404 });

  await db.insert(healthSyncs).values({
    mealLogId: `${id}:${nutrient}`,
    mealDate: meal.mealDate,
    syncedAt: new Date().toISOString(),
  }).onConflictDoNothing();

  return json({ ok: true, id, nutrient });
}
