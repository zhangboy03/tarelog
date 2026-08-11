import { env } from "cloudflare:workers";
import { requireAppAccess } from "@/lib/access";
import { resolveNutrition } from "@/lib/nutrition";
import { nutritionCache } from "@/lib/nutrition-cache";

type RuntimeEnv = {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  USDA_API_KEY?: string;
};

const runtime = env as unknown as RuntimeEnv;

function runtimeValue(name: keyof RuntimeEnv) {
  return runtime[name] || process.env[name] || "";
}

export async function POST(request: Request) {
  const denied = await requireAppAccess(request);
  if (denied) return denied;
  const apiKey = runtimeValue("AI_API_KEY");

  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.ingredientName || "").trim().slice(0, 50);
  const grams = Number(body.grams || 0);
  if (!name) return Response.json({ error: "请先填写食材名称。" }, { status: 400 });
  if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
    return Response.json({ error: "请先确认食材重量。" }, { status: 400 });
  }

  const match = await resolveNutrition({
    name,
    grams,
    apiKey,
    baseUrl: runtimeValue("AI_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: runtimeValue("AI_MODEL") || "qwen3.7-plus",
    usdaApiKey: runtimeValue("USDA_API_KEY") || "DEMO_KEY",
    cache: nutritionCache,
  });
  if (!match.matched) return Response.json({ error: match.nutritionSource }, { status: 422 });
  return Response.json({ nutrition: match });
}
