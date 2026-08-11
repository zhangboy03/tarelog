import { chatCompletionsEndpoint } from "./ai-endpoint.ts";

export type NutritionMatch = {
  ingredientName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  caffeine: number;
  matched: boolean;
  nutritionSource: string;
  nutritionSourceUrl?: string;
};

export type NutritionCache = {
  get: (keys: string[], ingredientName: string, grams: number) => Promise<NutritionMatch | null>;
  set: (key: string, match: NutritionMatch, grams: number) => Promise<void>;
};

type NutritionReference = {
  aliases: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
  caffeine?: number;
  source?: string;
  sourceUrl?: string;
};

const usdaCache = new Map<string, NutritionReference | null>();

const nutrition: Record<string, NutritionReference> = {
  "鸡胸肉": { aliases: ["鸡胸", "鸡胸肉"], kcal: 118, protein: 24.6, carbs: 0.6, fat: 1.9 },
  "鸡腿肉": {
    aliases: ["鸡腿", "鸡腿肉", "鸡腿肉丁", "鲜鸡腿肉丁", "鸡腿丁", "去骨鸡腿肉", "去皮鸡腿"],
    kcal: 121,
    protein: 19.7,
    carbs: 0,
    fat: 4.12,
    fiber: 0,
    sugar: 0,
    saturatedFat: 1.1,
    sodium: 95,
    caffeine: 0,
    source: "USDA FoodData Central · Chicken thigh, meat only, raw（每100克）",
    sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/173627/nutrients",
  },
  "五花肉": { aliases: ["五花", "猪五花"], kcal: 395, protein: 14, carbs: 2.4, fat: 37 },
  "猪里脊": { aliases: ["里脊肉", "猪里脊"], kcal: 155, protein: 20.2, carbs: 0.7, fat: 7.9 },
  "牛肉": { aliases: ["牛肉", "牛里脊", "牛腩"], kcal: 125, protein: 19.9, carbs: 2, fat: 4.2 },
  "虾仁": { aliases: ["虾", "虾仁", "大虾", "海白虾"], kcal: 93, protein: 18.6, carbs: 2.8, fat: 0.8 },
  "鸡蛋": { aliases: ["鸡蛋", "蛋"], kcal: 144, protein: 13.3, carbs: 2.8, fat: 8.8 },
  "大米": { aliases: ["大米", "米"], kcal: 346, protein: 7.4, carbs: 77.9, fat: 0.8 },
  "熟米饭": { aliases: ["米饭", "熟米"], kcal: 116, protein: 2.6, carbs: 25.9, fat: 0.3 },
  "燕麦": { aliases: ["燕麦", "麦片"], kcal: 338, protein: 10.1, carbs: 77.4, fat: 0.2 },
  "红薯": { aliases: ["红薯", "地瓜"], kcal: 61, protein: 0.7, carbs: 15.3, fat: 0.2 },
  "土豆": { aliases: ["土豆", "马铃薯"], kcal: 81, protein: 2.6, carbs: 17.8, fat: 0.2 },
  "西兰花": { aliases: ["西兰花", "绿花椰菜"], kcal: 27, protein: 3.5, carbs: 3.7, fat: 0.6 },
  "生菜": { aliases: ["生菜"], kcal: 16, protein: 1.4, carbs: 2.1, fat: 0.4 },
  "番茄": { aliases: ["番茄", "西红柿"], kcal: 15, protein: 0.9, carbs: 3.3, fat: 0.2 },
  "香蕉": { aliases: ["香蕉"], kcal: 93, protein: 1.4, carbs: 22, fat: 0.2 },
  "苹果": { aliases: ["苹果"], kcal: 53, protein: 0.4, carbs: 13.7, fat: 0.2 },
  "山药": {
    aliases: ["山药", "小白嘴山药", "铁棍山药", "淮山", "淮山药", "麻山药", "白山药", "薯蓣"],
    kcal: 58.1,
    protein: 1.9,
    carbs: 12.4,
    fat: 0.2,
    source: "中国食物成分表 · 山药（鲜，每100克可食部）",
    sourceUrl: "https://nlc.chinanutri.cn/fq/foodinfo/525.html",
  },
  "青提": {
    aliases: ["青提", "青葡萄", "绿色无籽葡萄", "绿葡萄"],
    kcal: 69,
    protein: 0.72,
    carbs: 18.1,
    fat: 0.16,
    fiber: 0.9,
    sugar: 15.5,
    saturatedFat: 0.054,
    sodium: 2,
    caffeine: 0,
    source: "USDA FoodData Central · Grapes, red or green, raw（每100克）",
    sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/174683/nutrients",
  },
  "橄榄油": {
    aliases: ["橄榄油", "特级初榨橄榄油"],
    kcal: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    fiber: 0,
    sugar: 0,
    saturatedFat: 13.8,
    sodium: 2,
    caffeine: 0,
    source: "USDA FoodData Central · Oil, olive（每100克）",
    sourceUrl: "https://fdc.nal.usda.gov/fdc-app.html#/food-details/171413/nutrients",
  },
  "豆腐": { aliases: ["豆腐", "嫩豆腐"], kcal: 84, protein: 6.6, carbs: 3.4, fat: 5.3 },
  "牛奶": { aliases: ["牛奶", "纯牛奶"], kcal: 54, protein: 3, carbs: 3.4, fat: 3.2 },
};

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function scaledNutrition(ingredientName: string, grams: number, value: NutritionReference): NutritionMatch {
  const factor = grams / 100;
  return {
    ingredientName,
    calories: round(value.kcal * factor),
    protein: round(value.protein * factor),
    carbs: round(value.carbs * factor),
    fat: round(value.fat * factor),
    fiber: round(Number(value.fiber || 0) * factor),
    sugar: round(Number(value.sugar || 0) * factor),
    saturatedFat: round(Number(value.saturatedFat || 0) * factor),
    sodium: round(Number(value.sodium || 0) * factor),
    caffeine: round(Number(value.caffeine || 0) * factor),
    matched: Boolean(value.sourceUrl),
    nutritionSource: value.source || "内置常用值缺少可核对来源，请联网匹配或手工确认。",
    nutritionSourceUrl: value.sourceUrl,
  };
}

export function resolveCatalogNutrition(name: string, grams: number): NutritionMatch | null {
  const normalized = name.trim().replace(/\s+/g, "");
  const entry = Object.entries(nutrition).find(([, value]) => value.aliases.some((alias) => normalized === alias.replace(/\s+/g, "")));
  return entry ? scaledNutrition(normalized, grams, entry[1]) : null;
}

type NormalizedFoodName = { generic_name_zh?: string; search_name_en?: string };

async function normalizeFoodName(options: { name: string; apiKey: string; baseUrl: string; model: string }): Promise<NormalizedFoodName | null> {
  try {
    const response = await fetch(chatCompletionsEndpoint(options.baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: `把食材“${options.name}”归一成营养数据库中的普通原始食材。去掉产地、品牌、品种和营销修饰，但不要改变食物种类。例如“小白嘴山药”归一为“山药”和“Chinese yam, raw”。只输出 JSON。` }],
        enable_thinking: false,
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "normalized_food_name",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                generic_name_zh: { type: "string" },
                search_name_en: { type: "string" },
              },
              required: ["generic_name_zh", "search_name_en"],
            },
          },
        },
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return JSON.parse((payload.choices?.[0]?.message?.content || "{}").replace(/^```json\s*|\s*```$/g, "")) as NormalizedFoodName;
  } catch {
    return null;
  }
}

type UsdaNutrient = { nutrientName?: string; nutrientNumber?: string; value?: number; unitName?: string };
type UsdaFood = { fdcId?: number; description?: string; dataType?: string; foodNutrients?: UsdaNutrient[] };

function usdaNutrient(food: UsdaFood, numbers: string[]) {
  const nutrient = (food.foodNutrients || []).find((item) => numbers.includes(String(item.nutrientNumber || "")) && Number.isFinite(Number(item.value)));
  return nutrient ? Number(nutrient.value) : NaN;
}

function usdaReference(food: UsdaFood): NutritionReference | null {
  const kcal = usdaNutrient(food, ["208", "958", "957"]);
  const protein = usdaNutrient(food, ["203"]);
  const fat = usdaNutrient(food, ["204"]);
  const carbs = usdaNutrient(food, ["205"]);
  if (![kcal, protein, fat, carbs].every(Number.isFinite)) return null;
  if (kcal < 0 || kcal > 900 || protein < 0 || protein > 100 || fat < 0 || fat > 100 || carbs < 0 || carbs > 100) return null;
  const fdcId = Number(food.fdcId || 0);
  return {
    aliases: [],
    kcal,
    protein,
    carbs,
    fat,
    fiber: Math.max(0, usdaNutrient(food, ["291"]) || 0),
    sugar: Math.max(0, usdaNutrient(food, ["269"]) || 0),
    saturatedFat: Math.max(0, usdaNutrient(food, ["606"]) || 0),
    sodium: Math.max(0, usdaNutrient(food, ["307"]) || 0),
    caffeine: Math.max(0, usdaNutrient(food, ["262"]) || 0),
    source: `USDA FoodData Central · ${String(food.description || "通用食材")}（每100克）`,
    sourceUrl: fdcId ? `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients` : "https://fdc.nal.usda.gov/",
  };
}

function usdaScore(food: UsdaFood, query: string) {
  const description = String(food.description || "").toLowerCase();
  const queryTokens = query.toLowerCase().split(/[^a-z]+/).filter((token) => token.length > 2);
  const identifyingTokens = queryTokens.filter((token) => !["raw", "fresh", "food", "meat", "only"].includes(token));
  if (identifyingTokens.length > 0 && !identifyingTokens.some((token) => description.includes(token))) return Number.NEGATIVE_INFINITY;
  let score = food.dataType === "Foundation" ? 4 : food.dataType === "SR Legacy" ? 3 : 0;
  if (/\braw\b/.test(description)) score += 4;
  if (/cooked|boiled|baked|canned|fried|juice|with salt|prepared/.test(description)) score -= 20;
  score += queryTokens.filter((token) => description.includes(token)).length * 8;
  score += ["291", "269", "606", "307", "262"].filter((number) => Number.isFinite(usdaNutrient(food, [number]))).length;
  return score;
}

export async function resolveUsdaNutrition(options: { name: string; englishName: string; grams: number; usdaApiKey?: string }): Promise<NutritionMatch | null> {
  const query = options.englishName.trim().toLowerCase();
  if (!query) return null;
  let reference = usdaCache.get(query);
  if (reference === undefined) {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("query", options.englishName);
    url.searchParams.set("dataType", "Foundation,SR Legacy");
    url.searchParams.set("pageSize", "10");
    try {
      const response = await fetch(url, { headers: { "X-Api-Key": options.usdaApiKey || "DEMO_KEY" } });
      if (!response.ok) return null;
      const payload = (await response.json()) as { foods?: UsdaFood[] };
      const candidates = (payload.foods || []).map((food) => ({ food, reference: usdaReference(food), score: usdaScore(food, query) })).filter((item) => item.reference && Number.isFinite(item.score));
      candidates.sort((a, b) => b.score - a.score);
      reference = candidates[0]?.reference || null;
      usdaCache.set(query, reference);
    } catch {
      return null;
    }
  }
  return reference ? scaledNutrition(options.name, options.grams, reference) : null;
}

export async function resolveNutrition(options: { name: string; genericName?: string; englishName?: string; grams: number; apiKey: string; baseUrl: string; model: string; usdaApiKey?: string; cache?: NutritionCache }) {
  const names = [options.name, options.genericName].map((name) => String(name || "").trim()).filter(Boolean);
  let catalogFallback: NutritionMatch | null = null;
  for (const name of names) {
    const catalogMatch = resolveCatalogNutrition(name, options.grams);
    if (catalogMatch) {
      catalogFallback = { ...catalogMatch, ingredientName: options.name };
      if (catalogMatch.matched) return catalogFallback;
    }
  }

  const normalized = options.englishName || !options.apiKey ? null : await normalizeFoodName(options);
  const genericName = String(options.genericName || normalized?.generic_name_zh || "").trim();
  if (genericName) {
    const catalogMatch = resolveCatalogNutrition(genericName, options.grams);
    if (catalogMatch) catalogFallback = { ...catalogMatch, ingredientName: options.name };
  }

  const englishName = String(options.englishName || normalized?.search_name_en || "").trim();
  const cacheKeys = [genericName, englishName, options.name].filter(Boolean);
  let cachedMatch: NutritionMatch | null = null;
  if (options.cache) {
    try {
      cachedMatch = await options.cache.get(cacheKeys, options.name, options.grams);
    } catch (error) {
      console.warn("Nutrition cache read failed", error);
    }
  }
  if (cachedMatch) return cachedMatch;

  const usdaMatch = englishName ? await resolveUsdaNutrition({ name: options.name, englishName, grams: options.grams, usdaApiKey: options.usdaApiKey }) : null;
  if (usdaMatch) {
    if (options.cache) {
      try {
        await options.cache.set(genericName || englishName || options.name, usdaMatch, options.grams);
      } catch (error) {
        console.warn("Nutrition cache write failed", error);
      }
    }
    return usdaMatch;
  }

  return catalogFallback || {
    ingredientName: options.name,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    saturatedFat: 0,
    sodium: 0,
    caffeine: 0,
    matched: false,
    nutritionSource: "没有找到可核对的结构化营养来源，请手工修正。",
  };
}
